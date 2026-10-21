/**
 * Per-purpose field profiles for data-collection forms.
 *
 * - `typical` fields are given to the AI as a starting point it must adapt to the request, and
 *   are used verbatim only when the AI provider is unavailable (local fallback).
 * - Education-only and quiz-only fields are removed from every non-education, non-assessment form
 *   unless the user explicitly asked for them (see verifier).
 */

export interface FieldTemplate {
  key: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
}

export interface DomainProfile {
  title: string;
  description: string;
  typical: FieldTemplate[];
}

const name: FieldTemplate = { key: 'name', type: 'name', label: 'Full Name', required: true };
const email: FieldTemplate = { key: 'email', type: 'email', label: 'Email Address', required: true };
const phone: FieldTemplate = { key: 'phone', type: 'phone', label: 'Phone Number', required: true };
const comments: FieldTemplate = { key: 'comments', type: 'long_text', label: 'Additional Comments', required: false };

export const DOMAIN_PROFILES: Record<string, DomainProfile> = {
  food_order: {
    title: 'Food Order Form',
    description: 'Place your food order and we will prepare it fresh for you.',
    typical: [
      name, phone,
      { key: 'order_type', type: 'mcq', label: 'Order Type', required: true, options: ['Delivery', 'Takeaway / Pickup', 'Dine-in'] },
      { key: 'menu_items', type: 'checkbox', label: 'Menu Items', required: true, options: ['Starters', 'Main Course', 'Breads', 'Rice & Biryani', 'Desserts', 'Beverages'] },
      { key: 'quantity', type: 'number', label: 'Number of Servings', required: true },
      { key: 'dietary_preference', type: 'mcq', label: 'Dietary Preference', required: false, options: ['Vegetarian', 'Non-vegetarian', 'Vegan', 'Jain'] },
      { key: 'delivery_address', type: 'address', label: 'Delivery Address', required: false },
      { key: 'delivery_time', type: 'time', label: 'Preferred Delivery / Pickup Time', required: false },
      { key: 'payment_method', type: 'dropdown', label: 'Payment Method', required: true, options: ['Cash on Delivery', 'UPI', 'Card'] },
      { key: 'special_instructions', type: 'long_text', label: 'Special Instructions (spice level, allergies)', required: false }
    ]
  },
  table_reservation: {
    title: 'Table Reservation',
    description: 'Reserve a table with us.',
    typical: [
      name, phone, email,
      { key: 'reservation_date', type: 'date', label: 'Reservation Date', required: true },
      { key: 'reservation_time', type: 'time', label: 'Reservation Time', required: true },
      { key: 'guests', type: 'number', label: 'Number of Guests', required: true },
      { key: 'seating', type: 'mcq', label: 'Seating Preference', required: false, options: ['Indoor', 'Outdoor', 'No preference'] },
      { key: 'occasion', type: 'dropdown', label: 'Occasion', required: false, options: ['None', 'Birthday', 'Anniversary', 'Business meal', 'Other'] },
      { key: 'special_requests', type: 'long_text', label: 'Special Requests', required: false }
    ]
  },
  restaurant_feedback: {
    title: 'Restaurant Feedback',
    description: 'Tell us about your dining experience.',
    typical: [
      { key: 'visit_date', type: 'date', label: 'Date of Visit', required: false },
      { key: 'food_quality', type: 'rating', label: 'Food Quality & Taste', required: true },
      { key: 'service_rating', type: 'rating', label: 'Service & Staff Friendliness', required: true },
      { key: 'ambience_rating', type: 'rating', label: 'Ambience & Cleanliness', required: true },
      { key: 'value_rating', type: 'rating', label: 'Value for Money', required: false },
      { key: 'recommend', type: 'yes_no', label: 'Would you recommend us to friends and family?', required: true },
      { key: 'comments', type: 'long_text', label: 'What could we do better?', required: false }
    ]
  },
  hotel_booking: {
    title: 'Hotel Booking Form',
    description: 'Book your stay with us.',
    typical: [
      name, email, phone,
      { key: 'check_in_date', type: 'date', label: 'Check-in Date', required: true },
      { key: 'check_out_date', type: 'date', label: 'Check-out Date', required: true },
      { key: 'room_type', type: 'dropdown', label: 'Room Type', required: true, options: ['Standard', 'Deluxe', 'Suite', 'Family Room'] },
      { key: 'guests', type: 'number', label: 'Number of Guests', required: true },
      { key: 'rooms', type: 'number', label: 'Number of Rooms', required: true },
      { key: 'special_requests', type: 'long_text', label: 'Special Requests', required: false }
    ]
  },
  travel: {
    title: 'Travel Booking Form',
    description: 'Tell us about your trip and we will plan it for you.',
    typical: [
      name, email, phone,
      { key: 'departure_city', type: 'short_text', label: 'Departure City', required: true },
      { key: 'destination', type: 'short_text', label: 'Destination', required: true },
      { key: 'departure_date', type: 'date', label: 'Departure Date', required: true },
      { key: 'return_date', type: 'date', label: 'Return Date', required: false },
      { key: 'travelers', type: 'number', label: 'Number of Travelers', required: true },
      { key: 'travel_mode', type: 'mcq', label: 'Preferred Mode of Travel', required: false, options: ['Flight', 'Train', 'Bus', 'Car'] },
      { key: 'accommodation', type: 'dropdown', label: 'Accommodation Preference', required: false, options: ['Budget', 'Standard', 'Premium', 'Not needed'] },
      { key: 'budget', type: 'price', label: 'Approximate Budget', required: false },
      { key: 'special_requests', type: 'long_text', label: 'Special Requests', required: false }
    ]
  },
  wedding: {
    title: 'Wedding RSVP',
    description: 'Please let us know if you can celebrate with us.',
    typical: [
      name,
      { key: 'attending', type: 'mcq', label: 'Will you be attending?', required: true, options: ['Joyfully accepts', 'Regretfully declines'] },
      { key: 'guests', type: 'number', label: 'Number of Guests (including you)', required: true },
      { key: 'meal_preference', type: 'mcq', label: 'Meal Preference', required: false, options: ['Vegetarian', 'Non-vegetarian', 'Jain', 'Vegan'] },
      phone,
      { key: 'message', type: 'long_text', label: 'Message for the Couple', required: false }
    ]
  },
  event_registration: {
    title: 'Event Registration',
    description: 'Register to attend the event.',
    typical: [
      name, email, phone,
      { key: 'organization', type: 'short_text', label: 'Organization / College', required: false },
      { key: 'ticket_type', type: 'dropdown', label: 'Ticket / Pass Type', required: true, options: ['General', 'Student', 'VIP'] },
      { key: 'sessions', type: 'checkbox', label: 'Sessions You Plan to Attend', required: false, options: ['Keynote', 'Workshops', 'Panel Discussion', 'Networking'] },
      { key: 'dietary_preference', type: 'mcq', label: 'Dietary Preference', required: false, options: ['Vegetarian', 'Non-vegetarian', 'Vegan', 'No preference'] },
      { key: 'terms', type: 'agreement', label: 'I agree to the event terms and code of conduct', required: true, options: ['I agree'] }
    ]
  },
  job_application: {
    title: 'Job Application',
    description: 'Apply for an open position with our team.',
    typical: [
      name, email, phone,
      { key: 'position', type: 'short_text', label: 'Position Applied For', required: true },
      { key: 'experience', type: 'dropdown', label: 'Years of Experience', required: true, options: ['Fresher', '1-2 years', '3-5 years', '6-10 years', '10+ years'] },
      { key: 'current_company', type: 'short_text', label: 'Current / Last Employer', required: false },
      { key: 'expected_salary', type: 'price', label: 'Expected Salary', required: false },
      { key: 'notice_period', type: 'dropdown', label: 'Notice Period', required: false, options: ['Immediate', '15 days', '1 month', '2 months', '3 months'] },
      { key: 'resume', type: 'resume', label: 'Upload Resume / CV', required: true },
      { key: 'linkedin', type: 'website', label: 'LinkedIn / Portfolio URL', required: false }
    ]
  },
  medical_appointment: {
    title: 'Appointment Request',
    description: 'Request an appointment with our clinic.',
    typical: [
      { key: 'patient_name', type: 'name', label: 'Patient Full Name', required: true },
      { key: 'dob', type: 'date', label: 'Date of Birth', required: true },
      phone, email,
      { key: 'department', type: 'dropdown', label: 'Department / Service', required: true, options: ['General Consultation', 'Dental', 'Pediatrics', 'Orthopedics', 'Other'] },
      { key: 'appointment_date', type: 'date', label: 'Preferred Appointment Date', required: true },
      { key: 'appointment_time', type: 'time', label: 'Preferred Time', required: false },
      { key: 'symptoms', type: 'long_text', label: 'Reason for Visit / Symptoms', required: true },
      { key: 'first_visit', type: 'yes_no', label: 'Is this your first visit?', required: false }
    ]
  },
  product_return: {
    title: 'Product Return Request',
    description: 'Request a return, refund or replacement.',
    typical: [
      name, email, phone,
      { key: 'order_number', type: 'short_text', label: 'Order Number', required: true },
      { key: 'product_name', type: 'short_text', label: 'Product Name', required: true },
      { key: 'purchase_date', type: 'date', label: 'Purchase Date', required: true },
      { key: 'return_reason', type: 'dropdown', label: 'Reason for Return', required: true, options: ['Damaged / defective', 'Wrong item received', 'Not as described', 'No longer needed', 'Other'] },
      { key: 'resolution', type: 'mcq', label: 'Preferred Resolution', required: true, options: ['Refund', 'Replacement', 'Store credit'] },
      { key: 'photo', type: 'photo', label: 'Photo of the Product (optional)', required: false },
      comments
    ]
  },
  service_request: {
    title: 'Service Request',
    description: 'Tell us what needs attention and we will get back to you.',
    typical: [
      name, email, phone,
      { key: 'category', type: 'dropdown', label: 'Request Category', required: true, options: ['Repair', 'Maintenance', 'Installation', 'Complaint', 'Other'] },
      { key: 'priority', type: 'mcq', label: 'Priority', required: true, options: ['Low', 'Medium', 'High', 'Urgent'] },
      { key: 'description', type: 'long_text', label: 'Describe the Issue', required: true },
      { key: 'preferred_date', type: 'date', label: 'Preferred Service Date', required: false },
      { key: 'attachment', type: 'file_upload', label: 'Attach Photo / Document (optional)', required: false }
    ]
  },
  real_estate: {
    title: 'Property Inquiry',
    description: 'Tell us what you are looking for.',
    typical: [
      name, email, phone,
      { key: 'inquiry_type', type: 'mcq', label: 'I want to', required: true, options: ['Buy', 'Rent', 'Sell', 'Lease'] },
      { key: 'property_type', type: 'dropdown', label: 'Property Type', required: true, options: ['Apartment / Flat', 'Independent House / Villa', 'Plot / Land', 'Commercial'] },
      { key: 'preferred_location', type: 'short_text', label: 'Preferred Location', required: true },
      { key: 'budget', type: 'price', label: 'Budget', required: false },
      { key: 'bedrooms', type: 'dropdown', label: 'Bedrooms', required: false, options: ['1 BHK', '2 BHK', '3 BHK', '4+ BHK'] },
      comments
    ]
  },
  student_admission: {
    title: 'Student Admission Form',
    description: 'Apply for admission.',
    typical: [
      { key: 'student_name', type: 'name', label: 'Student Full Name', required: true },
      { key: 'dob', type: 'date', label: 'Date of Birth', required: true },
      { key: 'gender', type: 'gender', label: 'Gender', required: true, options: ['Female', 'Male', 'Other'] },
      { key: 'class_applying', type: 'dropdown', label: 'Class / Course Applying For', required: true, options: ['Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12', 'Undergraduate'] },
      { key: 'previous_school', type: 'short_text', label: 'Previous School / College', required: false },
      { key: 'parent_name', type: 'name', label: 'Parent / Guardian Name', required: true },
      phone, email,
      { key: 'address', type: 'address', label: 'Residential Address', required: true },
      { key: 'marksheet', type: 'file_upload', label: 'Upload Previous Marksheet', required: false }
    ]
  },
  customer_feedback: {
    title: 'Customer Feedback',
    description: 'We value your feedback.',
    typical: [
      { key: 'overall_rating', type: 'rating', label: 'Overall Satisfaction', required: true },
      { key: 'quality_rating', type: 'rating', label: 'Quality of Product / Service', required: true },
      { key: 'support_rating', type: 'rating', label: 'Staff / Support Helpfulness', required: false },
      { key: 'recommend', type: 'mcq', label: 'How likely are you to recommend us?', required: true, options: ['Very likely', 'Likely', 'Not sure', 'Unlikely'] },
      { key: 'liked_most', type: 'long_text', label: 'What did you like the most?', required: false },
      { key: 'improve', type: 'long_text', label: 'What should we improve?', required: false }
    ]
  },
  business_inquiry: {
    title: 'Business Inquiry',
    description: 'Tell us about your requirement and our team will contact you.',
    typical: [
      name, email, phone,
      { key: 'company', type: 'short_text', label: 'Company Name', required: false },
      { key: 'inquiry_type', type: 'dropdown', label: 'Inquiry Type', required: true, options: ['Quotation', 'Partnership', 'Bulk order', 'Other'] },
      { key: 'budget', type: 'price', label: 'Estimated Budget', required: false },
      { key: 'requirement', type: 'long_text', label: 'Describe Your Requirement', required: true }
    ]
  },
  registration: {
    title: 'Registration Form',
    description: 'Fill in your details to register.',
    typical: [
      name, email, phone,
      { key: 'organization', type: 'short_text', label: 'Organization / Institution', required: false },
      { key: 'city', type: 'short_text', label: 'City', required: false },
      { key: 'category', type: 'dropdown', label: 'Registration Category', required: true, options: ['Individual', 'Group', 'Corporate'] },
      { key: 'terms', type: 'agreement', label: 'I agree to the terms and conditions', required: true, options: ['I agree'] }
    ]
  },
  appointment_booking: {
    title: 'Appointment Booking',
    description: 'Book a convenient time with us.',
    typical: [
      name, phone, email,
      { key: 'service', type: 'dropdown', label: 'Service Required', required: true, options: ['Consultation', 'Follow-up', 'Other'] },
      { key: 'preferred_date', type: 'date', label: 'Preferred Date', required: true },
      { key: 'preferred_time', type: 'time', label: 'Preferred Time', required: true },
      comments
    ]
  },
  report: {
    title: 'Incident Report',
    description: 'Report what happened so it can be reviewed and resolved.',
    typical: [
      { key: 'reporter_name', type: 'name', label: 'Reported By', required: true },
      { key: 'department', type: 'short_text', label: 'Department / Location', required: true },
      { key: 'incident_date', type: 'date', label: 'Date of Incident', required: true },
      { key: 'incident_time', type: 'time', label: 'Time of Incident', required: false },
      { key: 'report_type', type: 'dropdown', label: 'Type of Incident', required: true, options: ['Injury', 'Equipment damage', 'Near miss', 'Security', 'Other'] },
      { key: 'severity', type: 'mcq', label: 'Severity', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
      { key: 'description', type: 'long_text', label: 'Describe What Happened', required: true },
      { key: 'action_taken', type: 'long_text', label: 'Immediate Action Taken', required: false },
      { key: 'evidence', type: 'file_upload', label: 'Attach Photos / Evidence (optional)', required: false }
    ]
  },
  contact: {
    title: 'Contact Us',
    description: 'Send us a message and we will reply shortly.',
    typical: [
      name, email,
      { key: 'phone', type: 'phone', label: 'Phone Number', required: false },
      { key: 'subject', type: 'short_text', label: 'Subject', required: true },
      { key: 'message', type: 'long_text', label: 'Message', required: true }
    ]
  },
  general: {
    title: 'Information Form',
    description: 'Please fill in the details below.',
    typical: [name, email, phone, comments]
  }
};

/** Labels/keys that only make sense in education forms or graded papers. */
export const EDUCATION_ONLY_PATTERN = /\b(?:enrol(?:l)?ment\s*(?:no\.?|number)?|roll\s*(?:no\.?|number)|student\s+id|gr\s*(?:no\.?|number)|hall\s*ticket|exam\s*seat|seat\s+number|mark\s*sheets?|marksheets?|leaving\s+certificate|school\s+leaving|cgpa|sgpa|percentage\s+obtained|marks\s+obtained)\b/i;
export const QUIZ_ONLY_PATTERN = /\b(?:total\s+marks|marks\s+obtained|your\s+score|score\s+obtained|correct\s+answer|answer\s+key|passing\s+marks|time\s+remaining)\b/i;

/**
 * Prompt mentions that make education fields legitimate: the form's purpose is about students
 * (admission, student progress report, exam registration, school registration). Merely mentioning
 * a college or university ("college fest registration") is not enough.
 */
export const EDUCATION_CONTEXT = /\b(?:student|students|school|class\s*\d+|grade\s*\d+|std\.?\s*\d+|semester|admission|enrol(?:l)?ment|roll\s*(?:no|number)|exam|examination|tuition|coaching|report\s+card)\b|ધોરણ|વિદ્યાર્થી|શાળા|છાત્ર|छात्र|विद्यालय|कक्षा/i;

export function profileFor(domain: string): DomainProfile {
  return DOMAIN_PROFILES[domain] || DOMAIN_PROFILES.general;
}

/**
 * Deterministic form used only when the AI provider is unavailable: the profile of the
 * detected purpose, without any assessment data.
 */
export function buildFallbackForm(domain: string, topicHint?: string): { title: string; description: string; questions: any[]; settings: any } {
  const p = profileFor(domain);
  return {
    title: topicHint && domain === 'general' ? topicHint : p.title,
    description: p.description,
    questions: p.typical.map(f => ({ key: f.key, type: f.type, label: f.label, required: Boolean(f.required), options: f.options || [] })),
    settings: { collect_emails: false }
  };
}
