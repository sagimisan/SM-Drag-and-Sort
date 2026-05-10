import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AnySizeDragSortableView, { AnySizeDragSortableViewRef } from './AnySizeDragSortableView';

/**
 * Minimal Example of SM-Drag-and-Sort SDK usage
 */
const SDKExample = () => {
  const [items, setItems] = useState([
    { id: '1', text: 'Item 1', color: '#ffadad' },
    { id: '2', text: 'Item 2', color: '#ffd6a5' },
    { id: '3', text: 'Item 3', color: '#fdffb6' },
    { id: '4', text: 'Item 4', color: '#caffbf' },
  ]);

  const sortableViewRef = useRef<AnySizeDragSortableViewRef>(null);

  const renderItem = (item: any, index: number | null, isMoved: boolean) => {
    return (
      <TouchableOpacity
        onLongPress={() => sortableViewRef.current?.startTouch(item, index!)}
        onPressOut={() => sortableViewRef.current?.onPressOut()}
        style={[
          styles.item,
          { backgroundColor: item.color, opacity: isMoved ? 0.8 : 1 }
        ]}
      >
        <Text style={styles.text}>{item.text}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AnySizeDragSortableView
        ref={sortableViewRef}
        dataSource={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDataChange={(newData, callback) => {
          setItems(newData);
          callback();
        }}
        containerStyle={styles.listContainer}
        childMarginTop={10}
        childMarginBottom={10}
        childMarginLeft={10}
        childMarginRight={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#f0f0f0',
  },
  listContainer: {
    paddingHorizontal: 10,
  },
  item: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  text: {
    fontWeight: 'bold',
  },
});

export default SDKExample;
