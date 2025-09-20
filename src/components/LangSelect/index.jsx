import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from "@material-tailwind/react";

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Portuguese', value: 'pt' }
];

function LanguageSelect() {
  const { i18n } = useTranslation();
 const [selectedLang, setSelectedLang] = useState(() => {
  const baseLang = i18n.language.split('-')[0]; // Normalize
  const current = languageOptions.find(opt => opt.value === baseLang);
  return current?.label || 'Select Language';
});

  const handleSelect = (label, value) => {
    setSelectedLang(label);
    i18n.changeLanguage(value);
  };

  return (
    <>
      <Select  value={selectedLang} onChange={handleSelect}>
      <Select.Trigger className="border-none text-white" placeholder={selectedLang} />
      <Select.List>
        {languageOptions.map(({ label, value }) => (
          <Select.Option key={value} onClick={() => handleSelect(label, value)}>
            {label}
          </Select.Option>
        ))}
      </Select.List>
    </Select>
    </>
  );
}

export default LanguageSelect;
