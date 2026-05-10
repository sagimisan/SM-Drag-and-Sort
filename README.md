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

## Getting Started

### 1. Clone the Repository
First, clone this repository to your local machine:
```bash
git clone https://github.com/sagimisan/SM-Drag-and-Sort.git
cd SM-Drag-and-Sort
```

## Quick Start (Demo App)
The provided demo app is fully configured and ready to go. Just run:

```bash
cd mobile-app
npm install
npx expo start
```
This will automatically install all dependencies, including the library logic.

## Manual Integration (SDK Usage)
If you want to use this component in your **own existing project**:

1. **Add Dependencies**:
   Ensure you have the required peer dependencies in your project:
   ```bash
   npm install react-native-safe-area-context
   ```

2. **Import the Library**:
   Since this is a local SDK, simply copy the `lib/` directory into your project's folder and import the component:
   ```tsx
   import AnySizeDragSortableView from './lib/AnySizeDragSortableView';
   ```

## Usage Example
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
