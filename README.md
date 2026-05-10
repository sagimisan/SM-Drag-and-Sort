# SM-Drag-and-Sort (SM-DS)
Modern Drag and Drop sort control for React Native (Function Components + TypeScript).

This is a modernized and optimized version of `react-native-drag-sort`, focusing on the **AnySizeDragSortableView** with smooth FLIP animations and support for dynamic item sizes.

## Features
- ✅ **Function Components & Hooks**: Fully rewritten using modern React patterns.
- ✅ **TypeScript**: Strongly typed props and state for better DX.
- ✅ **AnySize Support**: Handle items with different widths and heights in the same grid.
- ✅ **Smooth Animations**: Full FLIP (Snapshot -> Invert -> Play) animations using `Animated` API.
- ✅ **RTL Support**: Native support for Hebrew and other Right-to-Left layouts.
- ✅ **SDK Ready**: Logic separated into custom hooks (`useAnySizeDragSort`) for maximum flexibility.

## Installation

```bash
# In your project
npm install react-native-safe-area-context
# Copy the lib/ directory to your project
```

## Quick Start (Mobile App Example)

We've provided a complete example app built with **Expo**.

### 1. Navigate to the mobile app directory
```bash
cd mobile-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the app
```bash
npx expo start
```
Press **`r`** to reload, **`i`** for iOS simulator, or **`a`** for Android emulator.

## Usage (SDK Style)

You can use the library without modifying its source code. Just import it and pass your data and styles.

```tsx
import AnySizeDragSortableView from './lib/AnySizeDragSortableView';

const MyComponent = () => {
  const [items, setItems] = useState(data);

  return (
    <AnySizeDragSortableView
      dataSource={items}
      keyExtractor={(item) => item.id}
      onDataChange={(newData, callback) => {
        setItems(newData);
        callback(); // Required to sync internal state
      }}
      renderItem={(item, index, isMoved) => (
        <MyItemView item={item} isMoved={isMoved} />
      )}
      containerStyle={{
        flexDirection: 'row-reverse', // For RTL
        justifyContent: 'center',
      }}
    />
  );
};
```

## API

### AnySizeDragSortableView Props

| Name | Type | Description |
| ---- | ---- | ----------- |
| **dataSource** | `T[]` | Array of items to sort. |
| **keyExtractor** | `(item, index) => string` | Unique key for each item. |
| **renderItem** | `(item, index, isMoved) => ReactElement` | Custom renderer for items. |
| **onDataChange** | `(data, callback) => void` | Called when a swap occurs. |
| **containerStyle** | `ViewStyle` | Style for the grid container (e.g., `flexDirection`). |
| **movedWrapStyle** | `ViewStyle` | Style for the item currently being dragged. |
| **headerViewHeight** | `number` | Height of the optional header. |
| **renderHeaderView** | `ReactElement` | Optional header component. |

## Credits
Original logic based on `react-native-drag-sort` by mochixuan. Optimized and modernized by SM-DS.
