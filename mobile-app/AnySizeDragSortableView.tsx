import React, { forwardRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Animated,
  Platform,
  UIManager,
  ViewStyle,
  ScrollViewProps,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useAnySizeDragSort, AnySizeDragSortableViewRef } from './useAnySizeDragSort';

if (Platform.OS === 'android') {
  if (UIManager && (UIManager as any).setLayoutAnimationEnabledExperimental) {
    (UIManager as any).setLayoutAnimationEnabledExperimental(true);
  }
}

export { AnySizeDragSortableViewRef };

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
    renderBottomView,
    renderHeaderView,
    scrollIndicatorInsets = { top: 0, left: 0, bottom: 0, right: 1 },
    onScrollRef: onScrollRefProp,
    movedWrapStyle = { backgroundColor: 'blue', zIndex: 999 },
  } = props;

  const {
    selectedItem,
    selectedPosition,
    scrollEnabled,
    keyToIndexMap,
    getAnimatedValue,
    _panResponder,
    _setLayoutData,
    onScrollListener,
    scrollRef
  } = useAnySizeDragSort(props, ref);

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
  container: { flex: 1, flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center' }
});

export default AnySizeDragSortableView;