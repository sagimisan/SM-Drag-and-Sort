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
  NativeModules,
  StyleSheet,
  ScrollView,
  View,
  Animated,
  PanResponder,
  Platform,
  UIManager
} from 'react-native';
import PropTypes from 'prop-types';

const ANIM_DURATION = 150;

if (Platform.OS === 'android') {
  if (UIManager && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const AnySizeDragSortableView = forwardRef((props, ref) => {
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
  const layoutMap = useRef(new Map());
  const keyToIndexMap = useRef(new Map());
  const animatedValues = useRef(new Map());
  const prevLayoutSnapshot = useRef(new Map());
  const isSwapping = useRef(false);
  const isUpdating = useRef(false);
  const isHasMove = useRef(false);
  const isHasMeasure = useRef(false);
  const preMoveKeyObj = useRef(null);
  const preGestureState = useRef(null);
  const autoInterval = useRef(null);
  const curScrollData = useRef(null);
  const autoObj = useRef({
    curDy: 0,
    scrollDx: 0,
    scrollDy: 0,
    hasScrollDy: null,
    forceScrollStatus: 0,
  });
  const scrollRef = useRef(null);
  const isMovePanResponder = useRef(false);
  const isScaleRecovery = useRef(null);

  // State
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedOriginLayout, setSelectedOriginLayout] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const getAnimatedValue = useCallback((key) => {
    if (!animatedValues.current.has(key)) {
      animatedValues.current.set(key, new Animated.ValueXY({ x: 0, y: 0 }));
    }
    return animatedValues.current.get(key);
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

  const scrollTo = useCallback((height, animated = true) => {
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

  const move = useCallback((fromKey, toKey, vy, isDiffline) => {
    isUpdating.current = true;
    const length = dataSource.length;
    const fromIndex = keyToIndexMap.current.get(fromKey);
    const toIndex = keyToIndexMap.current.get(toKey);

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

  const moveTouch = useCallback((nativeEvent, gestureState) => {
    isHasMove.current = true;
    if (nativeEvent) {
      preGestureState.current = gestureState;
    }

    if (!selectedOriginLayout) return;

    let { dx, dy, vy, moveY, y0 } = gestureState;

    if (isStartupAuto()) {
      const curDis = selectedOriginLayout.y + dy - autoObj.current.hasScrollDy;
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
      dy = dy - autoObj.current.hasScrollDy;
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

        let nextLineLastLayout = null;
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
          let closestRowLastItem = null;
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

    const nextLeft = parseInt(selectedOriginLayout.x + dx + 0.5);
    const nextTop = parseInt(selectedPosition.initTop + (moveY - y0) + 0.5);

    if (selectedPosition.left !== nextLeft || selectedPosition.top !== nextTop) {
      setSelectedPosition((prev) => ({
        ...prev,
        left: nextLeft,
        top: nextTop
      }));
    }
  }, [selectedOriginLayout, selectedPosition, headerViewHeight, startAutoScroll, isStartupAuto, selectedKey, childMarginLeft, childMarginRight, childMarginTop, childMarginBottom, areaOverlapRatio, move]);

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
      if (!curScrollData.current.hasScroll) return;

      if (autoObj.current.forceScrollStatus === 1) {
        autoObj.current.scrollDy = autoObj.current.scrollDy + autoThrottle;
      } else if (autoObj.current.forceScrollStatus === -1) {
        autoObj.current.scrollDy = autoObj.current.scrollDy - autoThrottle;
      }

      scrollTo(autoObj.current.scrollDy, false);
      dealtScrollStatus();

      const moveParams = {
        ...(preGestureState.current || {}),
        dx: autoObj.current.scrollDx,
        dy: autoObj.current.curDy + autoObj.current.scrollDy,
      };

      if (Platform.OS === 'android') {
        setTimeout(() => {
          if (isHasMove.current) moveTouch(null, moveParams);
        }, 1);
      } else {
        moveTouch(null, moveParams);
      }
    }, autoThrottleDuration);
  }, [autoThrottle, autoThrottleDuration, clearAutoInterval, dealtScrollStatus, moveTouch, scrollTo]);

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

  const startTouch = useCallback((item, index) => {
    isHasMove.current = false;
    isHasMeasure.current = true;
    preMoveKeyObj.current = null;
    if (isStartupAuto()) {
      autoObj.current.scrollDy = autoObj.current.hasScrollDy = curScrollData.current.offsetY;
    }
    const key = keyExtractor(item, index);
    const curLayout = layoutMap.current.get(key);
    const firstOffsetY = curScrollData.current?.offsetY || 0;
    const initTop = parseInt(curLayout.y - firstOffsetY + headerViewHeight + 0.5);

    setScrollEnabled(false);
    setSelectedItem(item);
    setSelectedKey(key);
    setSelectedOriginLayout({ ...curLayout });
    setSelectedPosition({
      left: parseInt(curLayout.x + 0.5),
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

  const _panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => {
        isMovePanResponder.current = false;
        return false;
      },
      onMoveShouldSetPanResponder: () => isMovePanResponder.current,
      onMoveShouldSetPanResponderCapture: () => isMovePanResponder.current,
      onPanResponderGrant: () => {},
      onPanResponderMove: (evt, gestureState) => moveTouch(evt, gestureState),
      onPanResponderRelease: () => endTouch(),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => false,
    })
  ).current;

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

  const _setLayoutData = useCallback((key, event) => {
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

  const onScrollListener = useCallback((event) => {
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

AnySizeDragSortableView.propTypes = {
  dataSource: PropTypes.array.isRequired,
  keyExtractor: PropTypes.func.isRequired,
  renderItem: PropTypes.func.isRequired,
  onDataChange: PropTypes.func,
  headerViewHeight: PropTypes.number,
  renderBottomView: PropTypes.element,
  bottomViewHeight: PropTypes.number,
  renderHeaderView: PropTypes.element,
  autoThrottle: PropTypes.number,
  onDragEnd: PropTypes.func,
  autoThrottleDuration: PropTypes.number,
  scrollIndicatorInsets: PropTypes.shape({
    top: PropTypes.number,
    left: PropTypes.number,
    bottom: PropTypes.number,
    right: PropTypes.number,
  }),
  onScrollListener: PropTypes.func,
  onScrollRef: PropTypes.func,
  areaOverlapRatio: PropTypes.number,
  movedWrapStyle: PropTypes.object,
  childMarginTop: PropTypes.number,
  childMarginBottom: PropTypes.number,
  childMarginLeft: PropTypes.number,
  childMarginRight: PropTypes.number
};

const styles = StyleSheet.create({
  box: { flex: 1, position: 'relative' },
  scroll: { flex: 1 },
  container: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' }
});

export default AnySizeDragSortableView;