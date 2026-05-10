import React, {
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useMemo
} from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Animated,
  PanResponder,
  Platform,
  UIManager,
  ViewStyle,
  ScrollViewProps,
  NativeSyntheticEvent,
  NativeScrollEvent,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent
} from 'react-native';

const ANIM_DURATION = 150;

if (Platform.OS === 'android') {
  if (UIManager && (UIManager as any).setLayoutAnimationEnabledExperimental) {
    (UIManager as any).setLayoutAnimationEnabledExperimental(true);
  }
}

export interface AnySizeDragSortableViewRef {
  startTouch: (item: any, index: number) => void;
  onPressOut: () => void;
  scrollTo: (height: number, animated?: boolean) => void;
}

interface LayoutData {
  x: number;
  y: number;
  width: number;
  height: number;
  key: string;
}

interface ScrollData {
  totalHeight: number;
  windowHeight: number;
  offsetY: number;
  hasScroll: boolean;
}

interface AutoObj {
  curDy: number;
  scrollDx: number;
  scrollDy: number;
  hasScrollDy: number | null;
  forceScrollStatus: number;
}

interface SelectedPosition {
  left: number;
  top: number;
  initTop: number;
  width: number;
  height: number;
}

export interface AnySizeDragSortableViewProps<T> {
  dataSource: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number | null, isMoved: boolean) => React.ReactElement;
  onDataChange: (data: T[], callback: () => void) => void;
  headerViewHeight?: number;
  renderBottomView?: React.ReactElement | null;
  bottomViewHeight?: number;
  renderHeaderView?: React.ReactElement | null;
  autoThrottle?: number;
  onDragEnd?: () => void;
  autoThrottleDuration?: number;
  scrollIndicatorInsets?: ScrollViewProps['scrollIndicatorInsets'];
  onScrollListener?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollRef?: (ref: ScrollView | null) => void;
  areaOverlapRatio?: number;
  movedWrapStyle?: ViewStyle;
  childMarginTop?: number;
  childMarginBottom?: number;
  childMarginLeft?: number;
  childMarginRight?: number;
}

const AnySizeDragSortableView = forwardRef<AnySizeDragSortableViewRef, AnySizeDragSortableViewProps<any>>((props, ref) => {
  const {
    dataSource,
    keyExtractor,
    renderItem,
    onDataChange,
    headerViewHeight = 0,
    renderBottomView,
    renderHeaderView,
    autoThrottle = 2,
    autoThrottleDuration = 10,
    areaOverlapRatio = 0.25,
    movedWrapStyle = { backgroundColor: 'blue', zIndex: 999 },
    childMarginTop = 10,
    childMarginBottom = 10,
    childMarginLeft = 10,
    childMarginRight = 10,
    onDragEnd,
    onScrollListener: onScrollListenerProp,
    onScrollRef: onScrollRefProp,
    scrollIndicatorInsets = { top: 0, left: 0, bottom: 0, right: 1 }
  } = props;

  // Refs for instance-like variables
  const layoutMap = useRef<Map<string, LayoutData>>(new Map());
  const keyToIndexMap = useRef<Map<string, number>>(new Map());
  const animatedValues = useRef<Map<string, Animated.ValueXY>>(new Map());
  const prevLayoutSnapshot = useRef<Map<string, LayoutData>>(new Map());
  const isSwapping = useRef(false);
  const isUpdating = useRef(false);
  const isHasMove = useRef(false);
  const isHasMeasure = useRef(false);
  const preMoveKeyObj = useRef<{ fromKey: string; toKey: string } | null>(null);
  const preGestureState = useRef<PanResponderGestureState | null>(null);
  const autoInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const curScrollData = useRef<ScrollData | null>(null);
  const autoObj = useRef<AutoObj>({
    curDy: 0,
    scrollDx: 0,
    scrollDy: 0,
    hasScrollDy: null,
    forceScrollStatus: 0,
  });
  const scrollRef = useRef<ScrollView | null>(null);
  const isMovePanResponder = useRef(false);
  const isScaleRecovery = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moveTouchRef = useRef<((nativeEvent: GestureResponderEvent | null, gestureState: PanResponderGestureState) => void) | null>(null);
  const endTouchRef = useRef<(() => void) | null>(null);

  // State
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedOriginLayout, setSelectedOriginLayout] = useState<LayoutData | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<SelectedPosition | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const getAnimatedValue = useCallback((key: string) => {
    if (!animatedValues.current.has(key)) {
      animatedValues.current.set(key, new Animated.ValueXY({ x: 0, y: 0 }));
    }
    return animatedValues.current.get(key)!;
  }, []);

  const clearAutoInterval = useCallback(() => {
    if (autoInterval.current) {
      clearInterval(autoInterval.current);
      autoInterval.current = null;
    }
  }, []);

  const initTag = useCallback(() => {
    clearAutoInterval();
    autoObj.current = {
      curDy: 0,
      scrollDx: 0,
      scrollDy: 0,
      hasScrollDy: null,
      forceScrollStatus: 0,
    };
  }, [clearAutoInterval]);

  const scrollTo = useCallback((height: number, animated = true) => {
    if (curScrollData.current) {
      if (autoObj.current.forceScrollStatus < 0 && curScrollData.current.offsetY <= 0) {
        autoObj.current.scrollDy = 0;
        return;
      } else if (
        autoObj.current.forceScrollStatus > 0 &&
        curScrollData.current.windowHeight + curScrollData.current.offsetY >= curScrollData.current.totalHeight
      ) {
        autoObj.current.scrollDy = curScrollData.current.offsetY;
        return;
      }
      curScrollData.current.hasScroll = false;
    }
    scrollRef.current?.scrollTo({ x: 0, y: height, animated });
  }, []);

  const isStartupAuto = useCallback(() => {
    return curScrollData.current != null;
  }, []);

  const dealtScrollStatus = useCallback(() => {
    const scrollData = curScrollData.current;
    if (scrollData == null || scrollData.offsetY == null) return;
    const { totalHeight, windowHeight, offsetY } = scrollData;
    if (totalHeight <= windowHeight + offsetY) {
      autoObj.current.forceScrollStatus = -2;
    } else if (offsetY <= 0) {
      autoObj.current.forceScrollStatus = 2;
    }
  }, []);

  const move = useCallback((fromKey: string, toKey: string, vy: number, isDiffline: boolean) => {
    isUpdating.current = true;
    const length = dataSource.length;
    const fromIndex = keyToIndexMap.current.get(fromKey) ?? -1;
    const toIndex = keyToIndexMap.current.get(toKey) ?? -1;

    if (fromIndex < 0 || fromIndex >= length || toIndex < 0 || toIndex >= length) {
      isUpdating.current = false;
      return;
    }

    if (
      preMoveKeyObj.current &&
      preMoveKeyObj.current.fromKey === fromKey &&
      preMoveKeyObj.current.toKey === toKey &&
      isDiffline &&
      ((toIndex - fromIndex > 0 && vy <= 0.01) || (toIndex - fromIndex < 0 && vy >= -0.01))
    ) {
      isUpdating.current = false;
      return;
    }

    preMoveKeyObj.current = { fromKey, toKey };

    const newDataSource = [...dataSource];
    const deleteItem = newDataSource.splice(fromIndex, 1);

    // Snapshot
    prevLayoutSnapshot.current = new Map();
    for (let [key, layout] of layoutMap.current) {
      prevLayoutSnapshot.current.set(key, { ...layout });
    }
    isSwapping.current = true;

    newDataSource.splice(toIndex, 0, deleteItem[0]);
    onDataChange(newDataSource, () => {
      setTimeout(() => {
        isUpdating.current = false;
        isSwapping.current = false;
      }, ANIM_DURATION);
    });
  }, [dataSource, onDataChange]);

  const startAutoScroll = useCallback(() => {
    if (autoInterval.current != null) return;
    autoInterval.current = setInterval(() => {
      if (
        autoObj.current.forceScrollStatus === 0 ||
        autoObj.current.forceScrollStatus === 2 ||
        autoObj.current.forceScrollStatus === -2
      ) {
        clearAutoInterval();
        return;
      }
      if (!curScrollData.current?.hasScroll) return;

      if (autoObj.current.forceScrollStatus === 1) {
        autoObj.current.scrollDy = autoObj.current.scrollDy + autoThrottle;
      } else if (autoObj.current.forceScrollStatus === -1) {
        autoObj.current.scrollDy = autoObj.current.scrollDy - autoThrottle;
      }

      scrollTo(autoObj.current.scrollDy, false);
      dealtScrollStatus();

      const moveParams: PanResponderGestureState = {
        ...(preGestureState.current || {} as PanResponderGestureState),
        dx: autoObj.current.scrollDx,
        dy: autoObj.current.curDy + autoObj.current.scrollDy,
      };

      if (Platform.OS === 'android') {
        setTimeout(() => {
          if (isHasMove.current && moveTouchRef.current) moveTouchRef.current(null, moveParams);
        }, 1);
      } else {
        if (moveTouchRef.current) moveTouchRef.current(null, moveParams);
      }
    }, autoThrottleDuration);
  }, [autoThrottle, autoThrottleDuration, clearAutoInterval, dealtScrollStatus, scrollTo]);

  const moveTouch = useCallback((nativeEvent: GestureResponderEvent | null, gestureState: PanResponderGestureState) => {
    isHasMove.current = true;
    if (nativeEvent) {
      preGestureState.current = gestureState;
    }

    if (!selectedOriginLayout || !selectedPosition || !selectedKey) return;

    let { dx, dy, vy, moveY, y0 } = gestureState;

    if (isStartupAuto() && curScrollData.current) {
      const curDis = selectedOriginLayout.y + dy - (autoObj.current.hasScrollDy || 0);
      if (nativeEvent != null) {
        const tempStatus = autoObj.current.forceScrollStatus;
        const minDownDiss = curDis + selectedPosition.height + headerViewHeight;
        const maxUpDiss = curDis + headerViewHeight;

        if ((tempStatus === 0 || tempStatus === 2) && vy > 0.01 && minDownDiss > curScrollData.current.windowHeight) {
          autoObj.current.curDy = dy;
          autoObj.current.forceScrollStatus = 1;
          startAutoScroll();
        } else if ((tempStatus === 0 || tempStatus === -2) && -vy > 0.01 && maxUpDiss < 0) {
          autoObj.current.curDy = dy;
          autoObj.current.forceScrollStatus = -1;
          startAutoScroll();
        }
      }

      if (vy != null) {
        if (autoObj.current.forceScrollStatus >= 1 && -vy > 0.01) {
          autoObj.current.forceScrollStatus = 0;
        } else if (autoObj.current.forceScrollStatus <= -1 && vy > 0.01) {
          autoObj.current.forceScrollStatus = 0;
        }
      }

      autoObj.current.scrollDx = dx;
      dy = dy - (autoObj.current.hasScrollDy || 0);
      if (nativeEvent != null) {
        dy = dy + autoObj.current.scrollDy;
        if (autoObj.current.forceScrollStatus === 1 || autoObj.current.forceScrollStatus === -1) {
          return;
        }
      }
    }

    if (!isUpdating.current) {
      const curLayout = layoutMap.current.get(selectedKey);
      if (curLayout) {
        const moveX1 = selectedOriginLayout.x + dx + childMarginLeft;
        const moveX2 = moveX1 + selectedOriginLayout.width - childMarginRight;
        const moveY1 = selectedOriginLayout.y + dy + childMarginTop;
        const moveY2 = moveY1 + selectedOriginLayout.height - childMarginBottom;
        const nextLineY = curLayout.y + curLayout.height;
        const moveArea = selectedOriginLayout.width * selectedOriginLayout.height;

        let nextLineLastLayout: LayoutData | null = null;
        for (let layout of layoutMap.current.values()) {
          const tempX1 = layout.x + childMarginLeft;
          const tempX2 = tempX1 + layout.width - childMarginRight;
          const tempY1 = layout.y + childMarginTop;
          const tempY2 = tempY1 + layout.height - childMarginBottom;

          if (nextLineY === layout.y && (!nextLineLastLayout || nextLineLastLayout.x < layout.x)) {
            nextLineLastLayout = layout;
          }

          if (layout.key === curLayout.key) continue;

          const w = Math.min(moveX2, tempX2) - Math.max(moveX1, tempX1);
          const h = Math.min(moveY2, tempY2) - Math.max(moveY1, tempY1);

          if (w <= 0 || h <= 0) continue;
          const overlapArea = w * h;
          const minArea = Math.min(layout.width * layout.height, moveArea);

          if (overlapArea >= minArea * areaOverlapRatio && overlapArea > 0) {
            move(curLayout.key, layout.key, vy, curLayout.y !== layout.y);
            break;
          }
        }

        if (!isUpdating.current && nextLineLastLayout &&
          moveX1 >= nextLineLastLayout.x + nextLineLastLayout.width && (moveY2 + moveY1) / 2 > nextLineLastLayout.y
        ) {
          move(curLayout.key, nextLineLastLayout.key, vy, curLayout.y !== nextLineLastLayout.y);
        }

        if (!isUpdating.current) {
          const moveCenterY = (moveY1 + moveY2) / 2;
          let closestRowLastItem: LayoutData | null = null;
          for (let layout of layoutMap.current.values()) {
            if (layout.key === curLayout.key) continue;
            if (moveCenterY >= layout.y && moveCenterY <= layout.y + layout.height) {
              if (!closestRowLastItem || layout.x + layout.width > closestRowLastItem.x + closestRowLastItem.width) {
                closestRowLastItem = layout;
              }
            }
          }
          if (closestRowLastItem && moveX1 >= closestRowLastItem.x + closestRowLastItem.width) {
            move(curLayout.key, closestRowLastItem.key, vy, curLayout.y !== closestRowLastItem.y);
          }
        }
      }
    }

    const nextLeft = parseInt(String(selectedOriginLayout.x + dx + 0.5));
    const nextTop = parseInt(String(selectedPosition.initTop + (moveY - y0) + 0.5));

    if (selectedPosition.left !== nextLeft || selectedPosition.top !== nextTop) {
      setSelectedPosition((prev) => prev ? ({
        ...prev,
        left: nextLeft,
        top: nextTop
      }) : null);
    }
  }, [selectedOriginLayout, selectedPosition, headerViewHeight, startAutoScroll, isStartupAuto, selectedKey, childMarginLeft, childMarginRight, childMarginTop, childMarginBottom, areaOverlapRatio, move]);

  const endTouch = useCallback(() => {
    isHasMove.current = false;
    initTag();
    onDragEnd?.();
    setSelectedItem(null);
    setSelectedKey(null);
    setSelectedOriginLayout(null);
    setSelectedPosition(null);
    setScrollEnabled(true);
  }, [initTag, onDragEnd]);

  const startTouch = useCallback((item: any, index: number) => {
    isHasMove.current = false;
    isHasMeasure.current = true;
    preMoveKeyObj.current = null;
    if (isStartupAuto()) {
      autoObj.current.scrollDy = autoObj.current.hasScrollDy = curScrollData.current?.offsetY || 0;
    }
    const key = keyExtractor(item, index);
    const curLayout = layoutMap.current.get(key);
    if (!curLayout) return;
    const firstOffsetY = curScrollData.current?.offsetY || 0;
    const initTop = parseInt(String(curLayout.y - firstOffsetY + headerViewHeight + 0.5));

    setScrollEnabled(false);
    setSelectedItem(item);
    setSelectedKey(key);
    setSelectedOriginLayout({ ...curLayout });
    setSelectedPosition({
      left: parseInt(String(curLayout.x + 0.5)),
      top: initTop,
      initTop,
      width: curLayout.width,
      height: curLayout.height
    });
    isMovePanResponder.current = true;
  }, [headerViewHeight, isStartupAuto, keyExtractor]);

  const onPressOut = useCallback(() => {
    isScaleRecovery.current = setTimeout(() => {
      if (isMovePanResponder.current && !isHasMove.current) {
        endTouch();
      }
    }, 220);
  }, [endTouch]);

  moveTouchRef.current = moveTouch;
  endTouchRef.current = endTouch;

  const _panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => {
          isMovePanResponder.current = false;
          return false;
        },
        onMoveShouldSetPanResponder: () => isMovePanResponder.current,
        onMoveShouldSetPanResponderCapture: () => isMovePanResponder.current,
        onPanResponderGrant: () => {},
        onPanResponderMove: (evt, gestureState) => moveTouchRef.current?.(evt, gestureState),
        onPanResponderRelease: () => endTouchRef.current?.(),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => false,
      }),
    []
  );

  useImperativeHandle(ref, () => ({
    startTouch,
    onPressOut,
    scrollTo
  }));

  useEffect(() => {
    initTag();
    if (!isHasMeasure.current) {
      setTimeout(() => {
        scrollTo(1, false);
        scrollTo(0, false);
      }, 30);
    }
    return () => {
      if (isScaleRecovery.current) clearTimeout(isScaleRecovery.current);
      clearAutoInterval();
    };
  }, [initTag, scrollTo, clearAutoInterval]);

  const _setLayoutData = useCallback((key: string, event: LayoutChangeEvent) => {
    const newLayout = { ...event.nativeEvent.layout, key };
    layoutMap.current.set(key, newLayout);

    if (isSwapping.current) {
      const prevLayout = prevLayoutSnapshot.current.get(key);
      if (prevLayout) {
        const dx = prevLayout.x - newLayout.x;
        const dy = prevLayout.y - newLayout.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          const animValue = getAnimatedValue(key);
          animValue.setValue({ x: dx, y: dy });
          Animated.spring(animValue, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            tension: 40,
            friction: 7,
          }).start();
        }
      }
    }
  }, [getAnimatedValue]);

  const onScrollListener = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nativeEvent = event.nativeEvent;
    curScrollData.current = {
      totalHeight: nativeEvent.contentSize.height,
      windowHeight: nativeEvent.layoutMeasurement.height,
      offsetY: nativeEvent.contentOffset.y,
      hasScroll: true,
    };
    if (nativeEvent.contentOffset.y !== 0) isHasMeasure.current = true;
    onScrollListenerProp?.(event);
  }, [onScrollListenerProp]);

  return (
    <View style={styles.box}>
      {selectedPosition && (
        <View
          style={[
            movedWrapStyle,
            {
              left: selectedPosition.left,
              top: selectedPosition.top,
              position: 'absolute',
              zIndex: 999,
              transform: [{ scale: 1.1 }]
            }
          ]}
        >
          {renderItem(selectedItem, null, true)}
        </View>
      )}
      <ScrollView
        bounces={false}
        scrollEventThrottle={1}
        scrollIndicatorInsets={scrollIndicatorInsets}
        ref={(r) => {
          scrollRef.current = r;
          onScrollRefProp?.(r);
        }}
        scrollEnabled={scrollEnabled}
        onScroll={onScrollListener}
        style={styles.scroll}
      >
        {renderHeaderView}
        <View style={styles.container}>
          {dataSource.map((item, index) => {
            const key = keyExtractor(item, index);
            keyToIndexMap.current.set(key, index);
            const animValue = getAnimatedValue(key);
            return (
              <Animated.View
                key={key}
                style={{ transform: animValue.getTranslateTransform() }}
                {..._panResponder.panHandlers}
                onLayout={(event) => _setLayoutData(key, event)}
              >
                {renderItem(item, index, false)}
              </Animated.View>
            );
          })}
        </View>
        {renderBottomView}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  box: { flex: 1, position: 'relative' },
  scroll: { flex: 1 },
  container: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' }
});

export default AnySizeDragSortableView;