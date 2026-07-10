import PreferenceStaticCheckboxGroup from './PreferenceStaticCheckboxGroup';

const OPTIONS = [
  {
    value: 'matching_events',
    label: 'Matching Events',
    icon: '🎯',
    description: 'Notify me when events match my music, vibe, and event interests.',
  },
  {
    value: 'favorite_venues',
    label: 'Favorite Venues',
    icon: '🏙️',
    description: 'Notify me when a favorite venue posts something new.',
  },
  {
    value: 'nearby_events',
    label: 'Nearby Events',
    icon: '📍',
    description: 'Notify me about events appearing near my preferred city.',
  },
  {
    value: 'friends_rsvp',
    label: 'Friend Activity',
    icon: '👥',
    description: 'Notify me when friends RSVP or show interest.',
  },
  {
    value: 'ambassador_events',
    label: 'Ambassador Promotions',
    icon: '🎟️',
    description: 'Notify me about ambassador-backed events and offers.',
  },
];

type Props = {
  selected?: string[];
};

export default function NotificationPreferencesSection({
  selected = [],
}: Props) {
  return (
    <PreferenceStaticCheckboxGroup
      title="Notifications"
      description="Choose what HypeKnight should alert you about."
      name="notification_preferences"
      options={OPTIONS}
      selected={selected}
      columns={2}
    />
  );
}