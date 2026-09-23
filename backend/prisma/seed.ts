import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the current working directory or fallback to the backend directory
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PromptForm AI database...');

  // Hash standard password for seed accounts
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Seed Default Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@promptform.ai' },
    update: {},
    create: {
      email: 'admin@promptform.ai',
      name: 'PromptForm Admin',
      password: hashedPassword,
      role: 'admin',
      subscriptionPlan: 'enterprise',
      credits: 9999,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'user@promptform.ai' },
    update: {},
    create: {
      email: 'user@promptform.ai',
      name: 'Jane Doe',
      password: hashedPassword,
      role: 'user',
      subscriptionPlan: 'pro',
      credits: 250,
    },
  });

  console.log('Users seeded:', { admin: admin.email, demoUser: demoUser.email });

  // 2. Seed Template Marketplace
  const templates = [
    {
      title: 'General Knowledge & Science Quiz',
      description: 'Test your science skills with this interactive multiple-choice trivia challenge.',
      category: 'education',
      thumbnail: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80', // Library book cover
      structure: {
        settings: {
          collect_emails: true,
          limit_responses: true,
          password: null,
          allow_editing: false,
          shuffle_questions: true,
          timer_limit: 20,
          anti_cheat_detection: true,
          team_members_only: false,
          invited_only: false,
          invited_emails: []
        },
        questions: [
          { type: 'name', label: 'Candidate Full Name', required: true, options: [] },
          { type: 'email', label: 'Contact Email Address', required: true, options: [] },
          { 
            type: 'mcq', 
            label: 'Which planet is known as the Red Planet?', 
            required: true, 
            options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
            validations: {
              points: 5,
              difficulty: 'EASY',
              correctAnswer: 'Mars'
            }
          },
          { 
            type: 'mcq', 
            label: 'What is the chemical symbol for Water?', 
            required: true, 
            options: ['CO2', 'H2O', 'NaCl', 'O2'],
            validations: {
              points: 5,
              difficulty: 'EASY',
              correctAnswer: 'H2O'
            }
          },
          { 
            type: 'mcq', 
            label: 'What is the approximate speed of light?', 
            required: true, 
            options: ['150,000 km/s', '300,000 km/s', '450,000 km/s', '600,000 km/s'],
            validations: {
              points: 10,
              difficulty: 'MEDIUM',
              correctAnswer: '300,000 km/s'
            }
          },
          { 
            type: 'mcq', 
            label: 'What is the acceleration due to gravity on Earth?', 
            required: true, 
            options: ['7.8 m/s²', '9.8 m/s²', '11.8 m/s²', '13.8 m/s²'],
            validations: {
              points: 10,
              difficulty: 'MEDIUM',
              correctAnswer: '9.8 m/s²'
            }
          },
          { 
            type: 'mcq', 
            label: 'Which organelle is known as the powerhouse of the cell?', 
            required: true, 
            options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi Apparatus'],
            validations: {
              points: 10,
              difficulty: 'MEDIUM',
              correctAnswer: 'Mitochondria'
            }
          },
          { 
            type: 'mcq', 
            label: 'What is the boiling point of water under standard conditions?', 
            required: true, 
            options: ['50°C', '75°C', '100°C', '125°C'],
            validations: {
              points: 5,
              difficulty: 'EASY',
              correctAnswer: '100°C'
            }
          },
          { 
            type: 'mcq', 
            label: 'What is the chemical symbol for Gold?', 
            required: true, 
            options: ['Au', 'Ag', 'Fe', 'Cu'],
            validations: {
              points: 10,
              difficulty: 'MEDIUM',
              correctAnswer: 'Au'
            }
          },
          { 
            type: 'mcq', 
            label: 'What is the main gas absorbed by plants during photosynthesis?', 
            required: true, 
            options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
            validations: {
              points: 10,
              difficulty: 'MEDIUM',
              correctAnswer: 'Carbon Dioxide'
            }
          },
          { 
            type: 'mcq', 
            label: 'What is the largest ocean on Earth?', 
            required: true, 
            options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
            validations: {
              points: 10,
              difficulty: 'MEDIUM',
              correctAnswer: 'Pacific Ocean'
            }
          },
          { 
            type: 'rating', 
            label: 'Rate your confidence level in Space Science:', 
            required: false, 
            options: [] 
          }
        ]
      }
    },
    {
      title: 'Customer Satisfaction (CSAT) Form',
      description: 'Measure client satisfaction levels after support interactions or purchases.',
      category: 'feedback',
      thumbnail: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80', // Cafe/Support cover
      structure: {
        questions: [
          { type: 'rating', label: 'How satisfied are you with the service provided?', required: true, options: [] },
          { type: 'mcq', label: 'Did the representative resolve your query?', required: true, options: ['Yes, immediately', 'Yes, after follow-ups', 'No, unresolved'] },
          { type: 'checkbox', label: 'Which attributes describe our support? (Select all)', required: false, options: ['Fast response', 'Polite tone', 'Knowledgeable staff', 'Clarity of solutions'] },
          { type: 'mcq', label: 'How likely are you to recommend our platform to a colleague?', required: true, options: ['Extremely likely', 'Very likely', 'Neutral', 'Not likely'] },
          { type: 'rating', label: 'Rate the user-interface design of our platform:', required: true, options: [] },
          { type: 'long_text', label: 'Tell us more about your experience and how we can improve.', required: false, options: [] }
        ]
      }
    },
    {
      title: 'Job Application Portal',
      description: 'Standard HR layout to capture candidate credentials, resume files, and preferences.',
      category: 'business',
      thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80', // Business/Corporate cover
      structure: {
        questions: [
          { type: 'name', label: 'Candidate Full Name', required: true, options: [] },
          { type: 'email', label: 'Contact Email Address', required: true, options: [] },
          { type: 'phone', label: 'Contact Phone Number', required: true, options: [] },
          { type: 'dropdown', label: 'Desired Workspace Department', required: true, options: ['Engineering', 'Marketing', 'Sales', 'Customer Success'] },
          { type: 'price', label: 'Expected Annual Salary Package', required: true, options: [] },
          { type: 'file_upload', label: 'Upload your CV / Resume', required: true, options: [] },
          { type: 'dropdown', label: 'Notice Period Availability', required: true, options: ['Immediate Joiner', '15 Days Notice', '30 Days Notice', '90 Days Notice'] },
          { type: 'short_text', label: 'Portfolio URL / LinkedIn Profile Link', required: false, options: [] },
          { type: 'long_text', label: 'Describe a complex technical problem you solved in your career.', required: true, options: [] }
        ]
      }
    },
    {
      title: 'Event RSVP & Registration',
      description: 'Gather attendee counts, dietary preferences, and guest details for corporate events.',
      category: 'personal',
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', // Personal resort cover
      structure: {
        questions: [
          { type: 'name', label: 'Attendee Full Name', required: true, options: [] },
          { type: 'email', label: 'Contact Email Address', required: true, options: [] },
          { type: 'mcq', label: 'Will you attend the event?', required: true, options: ['Yes, RSVP', 'No, declined'] },
          { type: 'dropdown', label: 'Number of Additional Guests', required: true, options: ['0 (Just me)', '1 Guest', '2 Guests', '3+ Guests'] },
          { type: 'checkbox', label: 'Select dietary requirements:', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal'] },
          { type: 'mcq', label: 'Do you require transport assistance or parking?', required: true, options: ['Need Parking', 'Need Shuttle', 'No assistance needed'] },
          { type: 'dropdown', label: 'Preferred Seating Zone', required: true, options: ['VIP Front Row', 'General Seating'] },
          { type: 'long_text', label: 'Any specific questions or requests for the organizers?', required: false, options: [] }
        ]
      }
    },
    {
      title: 'Patient Intake & Medical History',
      description: 'Provide basic medical records and contact details before consulting.',
      category: 'health',
      thumbnail: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&q=80', // Medical cover
      structure: {
        questions: [
          { type: 'name', label: 'Patient Full Name', required: true, options: [] },
          { type: 'date', label: 'Date of Birth', required: true, options: [] },
          { type: 'mcq', label: 'Gender Identification', required: true, options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
          { type: 'phone', label: 'Contact Number', required: true, options: [] },
          { type: 'short_text', label: 'Emergency Contact Name & Relation', required: true, options: [] },
          { type: 'short_text', label: 'Primary Health Insurance Provider', required: true, options: [] },
          { type: 'short_text', label: 'Insurance Policy Number', required: true, options: [] },
          { type: 'long_text', label: 'Brief Medical History & Current Symptoms', required: true, options: [] },
          { type: 'long_text', label: 'List any known drug or food allergies', required: true, options: [] },
          { type: 'agreement', label: 'I consent to the clinical privacy and data protection policies.', required: true, options: [] }
        ]
      }
    },
    {
      title: 'Gym Membership & Waiver Form',
      description: 'Sign up for fitness training packages and agree to liability waivers.',
      category: 'health',
      thumbnail: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&q=80', // Gym cover
      structure: {
        questions: [
          { type: 'name', label: 'Full Name', required: true, options: [] },
          { type: 'phone', label: 'Contact Mobile Number', required: true, options: [] },
          { type: 'short_text', label: 'Emergency Contact Name & Phone', required: true, options: [] },
          { type: 'mcq', label: 'Preferred Package Plan', required: true, options: ['Monthly Standard', 'Annual VIP Plan', 'Weekend Only'] },
          { type: 'agreement', label: 'I agree to the health and fitness training liability waivers.', required: true, options: [] }
        ]
      }
    },
    {
      title: 'Dining Experience Review',
      description: 'Give feedback about food quality, hygiene, and ambience at our restaurant.',
      category: 'feedback',
      thumbnail: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80', // Dining cover
      structure: {
        questions: [
          { type: 'rating', label: 'Overall Food Quality', required: true, options: [] },
          { type: 'mcq', label: 'Rate our staff service efficiency:', required: true, options: ['Excellent', 'Good', 'Average', 'Poor'] },
          { type: 'rating', label: 'Restaurant Ambience & Cleanliness', required: true, options: [] }
        ]
      }
    },
    {
      title: 'Hotel Booking & Room Selection',
      description: 'Book accommodation dates and select room specifications.',
      category: 'personal',
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80', // Hotel cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Lead Guest Name', required: true, options: [] },
          { type: 'date', label: 'Check-in Date', required: true, options: [] },
          { type: 'dropdown', label: 'Select Room Type', required: true, options: ['Standard Room', 'Deluxe Room', 'Executive Suite'] }
        ]
      }
    },
    {
      title: 'Travel & Tour Booking Request',
      description: 'Submit passenger info, travel destination preferences, and class settings.',
      category: 'personal',
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', // Beach cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Primary Traveler Name', required: true, options: [] },
          { type: 'dropdown', label: 'Select Preferred Travel Cabin', required: true, options: ['Economy Class', 'Business Class', 'First Class'] },
          { type: 'short_text', label: 'Passport Number', required: true, options: [] },
          { type: 'long_text', label: 'Special travel requests / Accommodations', required: false, options: [] }
        ]
      }
    },
    {
      title: 'Employee Performance Evaluation',
      description: 'Internal evaluation template to rate professional goals and achievements.',
      category: 'business',
      thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80', // Corporate cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Employee Name', required: true, options: [] },
          { type: 'dropdown', label: 'Assigned Department', required: true, options: ['Engineering', 'Product Management', 'Sales & Marketing', 'Human Resources'] },
          { type: 'rating', label: 'Rate your overall team alignment:', required: true, options: [] },
          { type: 'long_text', label: 'Describe your key achievements in the current quarter.', required: true, options: [] }
        ]
      }
    },
    {
      title: 'Leave Request Form',
      description: 'Employee form to submit annual leaves or sick leaves requests.',
      category: 'business',
      thumbnail: 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=600&q=80', // Calendar/Leave cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Employee Name', required: true, options: [] },
          { type: 'dropdown', label: 'Leave Type', required: true, options: ['Annual Leave', 'Sick Leave', 'Maternity / Paternity', 'Unpaid Leave'] },
          { type: 'date', label: 'Start Date of Leave', required: true, options: [] },
          { type: 'date', label: 'End Date of Leave', required: true, options: [] },
          { type: 'long_text', label: 'Additional details / Handover notes', required: false, options: [] }
        ]
      }
    },
    {
      title: 'Product Demo Request',
      description: 'Request a customized product walk-through for enterprise teams.',
      category: 'business',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80', // Tech cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Company / Organization Name', required: true, options: [] },
          { type: 'short_text', label: 'Work Email Address', required: true, options: [] },
          { type: 'dropdown', label: 'Estimate Team Size', required: true, options: ['1-5 users', '6-25 users', '26-100 users', '100+ Enterprise'] },
          { type: 'mcq', label: 'Preferred demo session time:', required: true, options: ['Morning Session', 'Afternoon Session', 'Evening Session'] }
        ]
      }
    },
    {
      title: 'Coding & Algorithmic Challenge',
      description: 'Technical evaluation test for backend software engineering roles.',
      category: 'education',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80', // Tech cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Candidate Full Name', required: true, options: [] },
          { 
            type: 'mcq', 
            label: 'Which of the following data structures operates on a First-In-First-Out (FIFO) basis?', 
            required: true, 
            options: ['Stack', 'Queue', 'Binary Tree', 'Hash Map'],
            validations: {
              points: 5,
              difficulty: 'EASY',
              correctAnswer: 'Queue'
            }
          },
          { 
            type: 'mcq', 
            label: 'What is the average time complexity of searching in a balanced Binary Search Tree (BST)?', 
            required: true, 
            options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
            validations: {
              points: 10,
              difficulty: 'MEDIUM',
              correctAnswer: 'O(log n)'
            }
          }
        ]
      }
    },
    {
      title: 'Personality & Career Orientation Quiz',
      description: 'Discover your professional traits and suitable job environments.',
      category: 'education',
      thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80', // Exam cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Your Full Name', required: true, options: [] },
          { type: 'mcq', label: 'Which work environment do you prefer?', required: true, options: ['Remote & Quiet', 'Collaborative Office', 'Flexible Hybrid'] },
          { type: 'rating', label: 'Rate your affinity for data-driven analytics:', required: true, options: [] }
        ]
      }
    },
    {
      title: 'IT Support & Bug Tracker',
      description: 'Submit technical issues, hardware failures, or software bugs to the IT desk.',
      category: 'business',
      thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80', // Corporate cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Reported By (Name)', required: true, options: [] },
          { type: 'dropdown', label: 'Issue Category', required: true, options: ['Hardware Malfunction', 'Software Installation', 'Network / WiFi', 'Security Alert'] },
          { type: 'long_text', label: 'Describe the bug / issue in detail:', required: true, options: [] },
          { type: 'file_upload', label: 'Upload error screenshot (Optional)', required: false, options: [] }
        ]
      }
    },
    {
      title: 'Service Quote & Price Calculator',
      description: 'Select services and request an estimated pricing proposal.',
      category: 'business',
      thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80', // Business cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Contact Name', required: true, options: [] },
          { type: 'checkbox', label: 'Services Required (Select all)', required: true, options: ['UI/UX Design', 'Full Stack Development', 'Cloud Migration', 'SEO Optimization'] },
          { type: 'dropdown', label: 'Estimated Budget Range', required: true, options: ['$1k - $5k', '$5k - $20k', '$20k - $100k', '$100k+'] }
        ]
      }
    },
    {
      title: 'Workshop & Webinar Signup',
      description: 'Register for upcoming technical seminars and reserve your slot.',
      category: 'personal',
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', // Personal cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Participant Name', required: true, options: [] },
          { type: 'short_text', label: 'Email Address for Webinar Link', required: true, options: [] },
          { type: 'mcq', label: 'Select Session Topic', required: true, options: ['Intro to AI Agents', 'Advanced React Frameworks', 'Scale Node.js Services'] }
        ]
      }
    },
    {
      title: 'Equipment & Room Rental Sheet',
      description: 'Book company equipment, lab spaces, or conference rooms.',
      category: 'personal',
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80', // Room cover
      structure: {
        questions: [
          { type: 'short_text', label: 'Reserved By (Name)', required: true, options: [] },
          { type: 'dropdown', label: 'Select Equipment/Space', required: true, options: ['VR Headset Pro', '3D Printer Lab', 'Main Boardroom', 'Video Recording Studio'] },
          { type: 'date', label: 'Reservation Start Date', required: true, options: [] },
          { type: 'date', label: 'Reservation End Date', required: true, options: [] }
        ]
      }
    },
    {
      title: 'Market Research & Brand Recall Survey',
      description: 'Feedback form to measure consumer preferences and product awareness.',
      category: 'feedback',
      thumbnail: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80', // Dining cover
      structure: {
        questions: [
          { type: 'mcq', label: 'How did you first hear about our product?', required: true, options: ['Social Media', 'Search Engine', 'Friend Recommendation', 'Billboard / Ads'] },
          { type: 'rating', label: 'Rate your familiarity with our brand:', required: true, options: [] },
          { type: 'mcq', label: 'How likely are you to purchase in the next 30 days?', required: true, options: ['Extremely likely', 'Somewhat likely', 'Neutral', 'Not likely'] }
        ]
      }
    },
    {
      title: 'Patient Satisfaction Survey',
      description: 'Post-consultation feedback to improve healthcare service quality.',
      category: 'feedback',
      thumbnail: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&q=80', // Doctor cover
      structure: {
        questions: [
          { type: 'rating', label: 'Rate doctor consultation satisfaction:', required: true, options: [] },
          { type: 'rating', label: 'Rate hospital cleanliness & hygiene:', required: true, options: [] },
          { type: 'mcq', label: 'Wait time before consulting was reasonable?', required: true, options: ['Yes, very quick', 'Acceptable wait', 'No, too long'] }
        ]
      }
    },
    {
      title: 'Cyberpunk Hackathon Team Registration',
      description: 'Futuristic team signup form with neon styling and technical queries.',
      category: 'business',
      thumbnail: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600&q=80',
      structure: {
        theme: {
          theme_name: "cyberpunk",
          layoutType: "compact-grid",
          primary_color: "#d946ef",
          background_color: "#09090b",
          font_family: "Fira Code",
          rtl: false,
          banner_url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600&q=80"
        },
        questions: [
          { type: 'name', label: 'Team Captain Full Name', required: true, options: [] },
          { type: 'short_text', label: 'Cyber Hack Team Name', required: true, options: [] },
          { type: 'email', label: 'Primary Contact Email Address', required: true, options: [] },
          { type: 'mcq', label: 'Core Programming Stack Focus', required: true, options: ['Rust / WebAssembly', 'TypeScript / Next.js', 'Python / AI Agents', 'Solidity / Web3'] },
          { type: 'short_text', label: 'Captain GitHub Profile Link', required: false, options: [] },
          { type: 'agreement', label: 'I agree to the hackathon code of conduct and cyber safety guidelines.', required: true, options: [] }
        ]
      }
    },
    {
      title: 'Artisan Cafe & Bakery Customer Survey',
      description: 'Delightful coffee house guest feedback questionnaire with warm editorial aesthetics.',
      category: 'feedback',
      thumbnail: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80',
      structure: {
        theme: {
          theme_name: "coffee-cream",
          layoutType: "single-column",
          primary_color: "#854d0e",
          background_color: "#fdfdfb",
          font_family: "Playfair Display",
          rtl: false,
          banner_url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80"
        },
        settings: {
          collect_emails: true,
          limit_responses: false,
          password: null,
          allow_editing: true,
          shuffle_questions: false,
          timer_limit: 0,
          anti_cheat_detection: false,
          team_members_only: false,
          invited_only: false,
          invited_emails: []
        },
        questions: [
          { type: 'name', label: 'Customer Full Name', required: true, options: [] },
          { type: 'email', label: 'Contact Email Address', required: true, options: [] },
          { type: 'phone', label: 'Contact Mobile Number', required: true, options: [] },
          { type: 'rating', label: 'Overall Coffee & Food Quality', required: true, options: [] },
          { type: 'mcq', label: 'How often do you visit our coffee house?', required: true, options: ['Daily', 'Weekly', 'Monthly', 'First Time'] },
          { type: 'checkbox', label: 'Which items did you order today? (Select all)', required: false, options: ['Espresso', 'Flat White Latte', 'Cold Brew', 'Butter Croissant', 'Almond Scone', 'Sourdough Sandwich'] },
          { type: 'mcq', label: 'Rate the service and friendliness of our staff:', required: true, options: ['Excellent', 'Good', 'Average', 'Poor'] },
          { type: 'rating', label: 'Order Delivery Speed & Efficiency', required: true, options: [] },
          { type: 'rating', label: 'Value for Money', required: true, options: [] },
          { type: 'rating', label: 'Cafe Cleanliness & Ambience', required: true, options: [] },
          { type: 'long_text', label: 'Any additional suggestions or feedback for our baristas?', required: false, options: [] }
        ]
      }
    },
    {
      title: 'Eco-Wellness Center Consultation Intake',
      description: 'Calming green interface for holistic therapy and mental wellness consults.',
      category: 'health',
      thumbnail: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&q=80',
      structure: {
        theme: {
          theme_name: "forest-green",
          layoutType: "split-card",
          primary_color: "#0f766e",
          background_color: "#f0fdfa",
          font_family: "Outfit",
          rtl: false,
          banner_url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&q=80"
        },
        questions: [
          { type: 'name', label: 'Patient Full Name', required: true, options: [] },
          { type: 'phone', label: 'Contact Phone Number', required: true, options: [] },
          { type: 'mcq', label: 'Describe current stress or wellness level:', required: true, options: ['Extremely Stressed', 'Moderately Overwhelmed', 'Seeking Balance', 'Healthy & Mindful'] },
          { type: 'checkbox', label: 'Focus Areas (Select all that apply)', required: false, options: ['Mindfulness & Meditation', 'Nutrition & Herbal Consults', 'Physical Yoga Therapy', 'Sleep Optimization'] },
          { type: 'long_text', label: 'Detail any specific areas you wish to focus on:', required: false, options: [] },
          { type: 'agreement', label: 'I authorize the holistic medical consultation policies.', required: true, options: [] }
        ]
      }
    },
    {
      title: 'Creative Art Gallery & Portfolio RSVP',
      description: 'Bold coral and cream layout for exhibitions and design showcases.',
      category: 'personal',
      thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80',
      structure: {
        theme: {
          theme_name: "creative-coral",
          layoutType: "compact-grid",
          primary_color: "#f43f5e",
          background_color: "#fffbeb",
          font_family: "Outfit",
          rtl: false,
          banner_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80"
        },
        questions: [
          { type: 'name', label: 'Attendee Name', required: true, options: [] },
          { type: 'email', label: 'Invitation Ticket Email', required: true, options: [] },
          { type: 'mcq', label: 'Will you attend the gallery vernissage?', required: true, options: ['Yes, attending', 'No, sending regrets'] },
          { type: 'checkbox', label: 'Art mediums you are interested in (Select all)', required: false, options: ['Abstract Painting', 'Digital NFTs', 'Interactive Sculpture', 'Photography'] }
        ]
      }
    },
    {
      title: 'Enterprise Cloud Migration Audit',
      description: 'High-contrast platinum corporate form for scaling IT architectures.',
      category: 'business',
      thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
      structure: {
        theme: {
          theme_name: "corporate-platinum",
          layoutType: "single-column",
          primary_color: "#4f46e5",
          background_color: "#f8fafc",
          font_family: "Inter",
          rtl: false,
          banner_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80"
        },
        questions: [
          { type: 'short_text', label: 'Enterprise Company Name', required: true, options: [] },
          { type: 'email', label: 'CTO / Director Work Email', required: true, options: [] },
          { type: 'dropdown', label: 'Current Cloud Infrastructure Provider', required: true, options: ['AWS (Amazon)', 'Google Cloud (GCP)', 'Microsoft Azure', 'On-Premise Servers'] },
          { type: 'mcq', label: 'Migration Target Timeline', required: true, options: ['Within 3 Months', '3-6 Months', 'Planning Phase only'] },
          { type: 'long_text', label: 'List any critical legacy database requirements:', required: false, options: [] }
        ]
      }
    }
  ];

  await prisma.template.deleteMany(); // Clear old configurations

  for (const t of templates) {
    await prisma.template.create({
      data: t
    });
  }

  console.log('Templates seeded successfully.');
  console.log('Database seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
