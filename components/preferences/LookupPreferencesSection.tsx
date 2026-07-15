import type { LookupValue } from '@/lib/config/lookups';
import PreferenceCheckboxGroup from './PreferenceCheckboxGroup';

type Props = {
  title: string;
  description: string;
  name: string;
  options?: LookupValue[];
  selected?: string[];
};

export default function LookupPreferencesSection({
  title,
  description,
  name,
  options = [],
  selected = [],
}: Props) {
  return (
    <PreferenceCheckboxGroup
      title={title}
      description={description}
      name={name}
      options={options}
      selected={selected}
    />
  );
}