import { useState, useRef, useMemo, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { AnySizeDragSortableViewRef } from './useAnySizeDragSort';

const { width } = Dimensions.get('window');

export interface ItemData {
  text: string;
  width: number;
  height: number;
}

const getW = (index: number, isWidth: boolean): number => {
  if (isWidth) {
    return index % 3 === 0 ? width - 40 : (width - 60) / 2;
  } else {
    return 70 + (index % 5) * 40;
  }
};

export const useAppLogic = () => {
  const initialItems = useMemo(() => {
    const alephBet = [
      'אלף - אוהל',
      'בית - זה בית',
      'גימל - גמל גדול',
      'דלת -דלת שפותחת את הכל',
      'הא - הדס',
      'וו - ורד',
      'זין וחית - זר חבצלות',
      'טית - טוב',
      'יוד - יופי',
      'כף - כן',
      'למד - לא',
      'מם ונון - מן ונופת',
      'סמך - ספר',
      'עין - עין',
      'פא - פרפר ופשוש',
      'צדיק - צחוק',
      'קף - קוף',
      'ריש - ראש',
      'שין - שלום',
      'תו - תודה'
    ];
    return alephBet.map((text, i) => ({
      text,
      width: getW(i, true),
      height: getW(i, false)
    }));
  }, []);

  const [items, setItems] = useState<ItemData[]>(initialItems);
  const [movedKey, setMovedKey] = useState<string | null>(null);
  const sortableViewRef = useRef<AnySizeDragSortableViewRef>(null);

  const onDeleteItem = useCallback((index: number) => {
    setItems((prevItems) => {
      const nextItems = [...prevItems];
      nextItems.splice(index, 1);
      return nextItems;
    });
  }, []);

  const handleLongPress = useCallback((item: ItemData, index: number) => {
    setMovedKey(item.text);
    sortableViewRef.current?.startTouch(item, index);
  }, []);

  const handlePressOut = useCallback(() => {
    sortableViewRef.current?.onPressOut();
  }, []);

  const onDragEnd = useCallback(() => {
    setMovedKey(null);
  }, []);

  return {
    items,
    setItems,
    movedKey,
    sortableViewRef,
    onDeleteItem,
    handleLongPress,
    handlePressOut,
    onDragEnd
  };
};
