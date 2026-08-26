export const HOSTELLER_CATEGORIES = [
  'Hostel', 'Mess', 'Food Court', 'Canteen', 'Transport', 'Academics', 'Outings', 'Shopping', 'Other'
];

export const DAY_SCHOLAR_CATEGORIES = [
  'Canteen', 'Books & Academics', 'Transport', 'Food Court', 'Outings', 'Shopping', 'Personal Needs', 'Other'
];

export const getCategories = (studentType) => {
  if (studentType === 'Hosteller') return HOSTELLER_CATEGORIES;
  return DAY_SCHOLAR_CATEGORIES;
};
