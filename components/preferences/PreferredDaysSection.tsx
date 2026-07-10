import PreferenceStaticCheckboxGroup from './PreferenceStaticCheckboxGroup';

const OPTIONS = [
  { value: 'monday', label: 'Monday', icon: 'M' },
  { value: 'tuesday', label: 'Tuesday', icon: 'T' },
  { value: 'wednesday', label: 'Wednesday', icon: 'W' },
  { value: 'thursday', label: 'Thursday', icon: 'T' },
  { value: 'friday', label: 'Friday', icon: 'F' },
  { value: 'saturday', label: 'Saturday', icon: 'S' },
  { value: 'sunday', label: 'Sunday', icon: 'S' },
];

type Props = {
  selected?: string[];
};

export default function PreferredDaysSection({
  selected = [],
}: Props) {
  return (
    <PreferenceStaticCheckboxGroup
      title="Preferred Days"
      description="Choose the days you are most likely to go out."
      name="preferred_days"
      options={OPTIONS}
      selected={selected}
      columns={4}
    />
  );
}