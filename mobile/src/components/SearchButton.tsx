import { Pressable } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '@/theme/colors';
import { useSearch } from '@/lib/SearchContext';
import ContryFace from '@/components/ContryFace';

// The search loop in the screen headers (sized to match the dashboard
// avatar circle). Opens Contry's search in the island tab bar, hopping to
// the contracts tab first when pressed elsewhere. Must render under
// SearchProvider, i.e. only on tab screens.
export default function SearchButton() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSearch();

  return (
    <Pressable
      onPress={() => {
        if (pathname !== '/contracts') router.push('/contracts');
        open();
      }}
      accessibilityRole="button"
      accessibilityLabel="Search with Contry"
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ContryFace slot="search-idle" size={22} fallbackIcon="search" color={theme.brandText} />
    </Pressable>
  );
}
