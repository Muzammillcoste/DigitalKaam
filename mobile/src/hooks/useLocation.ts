import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  area: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    area: null,
    isLoading: false,
    error: null,
  });

  const getCurrentArea = useCallback(async (): Promise<string | null> => {
    setState({ area: null, isLoading: true, error: null });

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState({ area: null, isLoading: false, error: 'Location permission denied' });
      return null;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [result] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      const area =
        result?.district ||
        result?.subregion ||
        result?.city ||
        result?.region ||
        'Current location';

      setState({ area, isLoading: false, error: null });
      return area;
    } catch (err: any) {
      setState({ area: null, isLoading: false, error: err.message });
      return null;
    }
  }, []);

  return { ...state, getCurrentArea };
}
