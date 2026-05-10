import { useState, useRef, useMemo, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { AnySizeDragSortableViewRef } from './useAnySizeDragSort';

const { width } = Dimensions.get('window');

export interface ItemData {
  text: string;
  width: number;
  height: number;
  color: string;
}

const COLORS = [
  '#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff',
  '#e2f0cb', '#b5ead7', '#ff9aa2', '#ffdac1', '#c7ceea', '#b2e2f2', '#fdfd96', '#826aed',
  '#c879ff', '#ffb7ff', '#3bf4fb', '#20bf55', '#f6f7eb', '#e94f37'
];

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
    const items = alephBet.map((text, i) => ({
      text,
      width: getW(i, true),
      height: getW(i, false),
      color: COLORS[i % COLORS.length]
    }));

    // Fisher-Yates Shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
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
