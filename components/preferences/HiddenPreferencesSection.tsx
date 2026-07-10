import PreferenceStaticCheckboxGroup from './PreferenceStaticCheckboxGroup';

const OPTIONS = [
  {
    value: 'hide_18_plus',
    label: 'Hide 18+ Events',
    icon: '🔞',
    description: 'Reduce or hide events marked 18+.',
  },
  {
    value: 'hide_smoking',
    label: 'Hide Smoking Events',
    icon: '🚭',
    description: 'Reduce events where smoking or hookah is allowed.',
  },
  {
    value: 'hide_ticketed',
    label: 'Hide Ticketed Events',
    icon: '🎟️',
    description: 'Prefer free or pay-at-the-door events.',
  },
  {
    value: 'hide_sold_out',
    label: 'Hide Sold-Out Events',
    icon: '⛔',
    description: 'Avoid events that are no longer accepting guests.',
  },
  {
    value: 'hide_external',
    label: 'Hide External Events',
    icon: '🌐',
    description: 'Prefer listings posted directly through HypeKnight.',
  },
];

type Props = {
  selected?: string[];
};

export default function HiddenPreferencesSection({
  selected = [],
}: Props) {
  return (
    <PreferenceStaticCheckboxGroup
      title="Things to Hide"
      description="Choose the types of listings you would rather see less often."
      name="hidden_preferences"
      options={OPTIONS}
      selected={selected}
      columns={2}
    />
  );
}