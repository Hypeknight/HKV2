import PreferenceStaticCheckboxGroup from './PreferenceStaticCheckboxGroup';

const OPTIONS = [
  {
    value: 'morning',
    label: 'Morning',
    icon: '🌅',
    description: 'Breakfasts, markets, races, and early events.',
  },
  {
    value: 'afternoon',
    label: 'Afternoon',
    icon: '☀️',
    description: 'Day parties, festivals, sports, and family events.',
  },
  {
    value: 'evening',
    label: 'Evening',
    icon: '🌇',
    description: 'Dinner, concerts, comedy, and date nights.',
  },
  {
    value: 'late_night',
    label: 'Late Night',
    icon: '🌙',
    description: 'Nightlife, clubs, after-parties, and late events.',
  },
  {
    value: 'after_hours',
    label: 'After Hours',
    icon: '🕒',
    description: 'Very late events that continue into the morning.',
  },
];

type Props = {
  selected?: string[];
};

export default function PreferredTimesSection({
  selected = [],
}: Props) {
  return (
    <PreferenceStaticCheckboxGroup
      title="Preferred Times"
      description="Choose when you are most likely to attend events."
      name="preferred_times"
      options={OPTIONS}
      selected={selected}
      columns={2}
    />
  );
}