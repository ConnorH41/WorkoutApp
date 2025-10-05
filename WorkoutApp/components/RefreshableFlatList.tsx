import React from 'react';
import { FlatList, RefreshControl, FlatListProps } from 'react-native';
import { colors } from '../styles/theme';

type Props<T> = FlatListProps<T> & {
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
};

export default function RefreshableFlatList<T>({
  onRefresh,
  refreshing = false,
  ...flatListProps
}: Props<T>) {
  const [isRefreshing, setIsRefreshing] = React.useState(refreshing);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    setIsRefreshing(refreshing);
  }, [refreshing]);

  return (
    <FlatList
      {...flatListProps}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    />
  );
}
