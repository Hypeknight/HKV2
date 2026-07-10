import PreferenceStaticCheckboxGroup from './PreferenceStaticCheckboxGroup';

const OPTIONS = [
  {
    value: 'hypeknight',
    label: 'HypeKnight Events',
    icon: '⚔️',
    description: 'Events posted directly through HypeKnight.',
  },
  {
    value: 'external',
    label: 'External Events',
    icon: '🌐',
    description: 'Supplemental events from outside providers.',
  },
];

type Props = {
  selected?: string[];
};

export default function EventSourcesSection({
  selected = ['hypeknight', 'external'],
}: Props) {
  return (
    <PreferenceStaticCheckboxGroup
      title="Event Sources"
      description="Choose which event sources should appear in your discovery feed."
      name="preferred_sources"
      options={OPTIONS}
      selected={selected}
      columns={2}
    />
  );
}