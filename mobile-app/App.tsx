import React, { useCallback } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AnySizeDragSortableView from './AnySizeDragSortableView';
import { useAppLogic, ItemData } from './useAppLogic';

const { width } = Dimensions.get('window');
const headerViewHeight = 180;
const bottomViewHeight = 40;

const App: React.FC = () => {
  const {
    items,
    setItems,
    movedKey,
    sortableViewRef,
    onDeleteItem,
    handleLongPress,
    handlePressOut,
    onDragEnd
  } = useAppLogic();

  const renderItem = useCallback((item: ItemData, index: number | null, isMoved: boolean) => {
    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item, index!)}
        onPressOut={handlePressOut}
      >
        <View style={styles.item_wrap}>
          <View style={styles.item_clear_wrap}>
            <TouchableOpacity onPress={() => onDeleteItem(index!)}>
              <Image source={require('./assets/img/clear.png')} style={styles.item_clear} />
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.item,
              { width: item.width, height: item.height, backgroundColor: item.color }
            ]}
          >
            {isMoved && (
              <View style={styles.item_icon_swipe}>
                <Image source={require('./assets/img/animal1.png')} style={styles.item_icon} />
              </View>
            )}
            <View style={styles.item_text_swipe}>
              <Text style={styles.item_text}>{item.text}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleLongPress, handlePressOut, onDeleteItem]);

  const renderHeaderView = (
    <View style={styles.aheader}>
      <Image source={{ uri: 'https://www.reuters.com/resizer/v2/OHRVOCXQWVNYDFN2BDMRNO6B3Y.jpg?auth=d966b5290f69e1623f6b1ca95c1daf490d9b3e25e11383dff6b13a999e98b0b8&width=640&quality=80' }} style={styles.aheader_img} />
      <View style={styles.aheader_context}>
        <Text style={styles.aheader_title}>לימוד א'-ב'</Text>
        <Text style={styles.aheader_desc}>מציירים בגיר וצבע, אלף-בית, אלף-בית... סדרו את האותיות לפי הסדר!</Text>
      </View>
    </View>
  );

  const renderBottomView = (
    <View style={styles.abottom}>
      <Text style={styles.abottom_desc}>שין - שלום ותו - תודה ונגמרה העבודה!</Text>
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.header}>
          <Text style={styles.header_title}>SM-DS</Text>
        </View>
        <AnySizeDragSortableView
          ref={sortableViewRef}
          dataSource={items}
          keyExtractor={(item) => item.text}
          renderItem={renderItem}
          onDataChange={(data, callback) => {
            setItems(data);
            callback?.();
          }}
          renderHeaderView={renderHeaderView}
          headerViewHeight={headerViewHeight}
          renderBottomView={renderBottomView}
          bottomViewHeight={bottomViewHeight}
          movedWrapStyle={styles.item_moved}
          onDragEnd={onDragEnd}
          containerStyle={styles.sortable_container}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  item_wrap: {
    position: 'relative',
    paddingHorizontal: 10,
    paddingTop: 20
  },
  item: {
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    borderRadius: 4,
  },
  item_clear_wrap: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 20,
    height: 20,
    zIndex: 999
  },
  item_clear: {
    width: 20,
    height: 20
  },
  item_moved: {
    opacity: 0.95,
    borderRadius: 4,
  },
  item_icon_swipe: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 50 * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  item_icon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  item_text_swipe: {
    backgroundColor: '#fff',
    width: 140,
    minHeight: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  item_text: {
    color: '#444',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  header: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomColor: '#2ecc71',
    borderBottomWidth: 2,
  },
  header_title: {
    color: '#333',
    fontSize: 24,
    fontWeight: 'bold'
  },
  sortable_container: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
  },
  aheader: {
    height: headerViewHeight,
    flexDirection: 'row',
    borderBottomColor: '#090909ff',
    borderBottomWidth: 2,
    zIndex: 100,
    backgroundColor: '#fff'
  },
  aheader_img: {
    width: headerViewHeight * 0.6,
    height: headerViewHeight * 0.6,
    resizeMode: 'cover',
    borderRadius: headerViewHeight * 0.3,
    marginLeft: 16,
    marginTop: 10,
  },
  aheader_context: {
    marginLeft: 8,
    height: headerViewHeight * 0.4,
    marginTop: 10
  },
  aheader_title: {
    color: '#333',
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  aheader_desc: {
    color: '#444',
    fontSize: 16,
    width: width - headerViewHeight * 0.6 - 32,
    textAlign: 'right',
  },
  abottom: {
    justifyContent: 'center',
    alignItems: 'center',
    height: bottomViewHeight,
    backgroundColor: '#fff',
    zIndex: 100,
    borderTopColor: '#2ecc71',
    borderTopWidth: 2,
  },
  abottom_desc: {
    color: '#333',
    fontSize: 20,
    fontWeight: 'bold'
  }
});

export default App;
