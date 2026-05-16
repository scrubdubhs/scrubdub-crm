import type { PipelineStage, LeadSource, DoorStatus } from './types'

export const PIPELINE_STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'new_lead',     label: 'New Lead',     color: 'bg-blue-500' },
  { key: 'quoted',       label: 'Quoted',       color: 'bg-yellow-500' },
  { key: 'follow_up',   label: 'Follow Up',    color: 'bg-orange-500' },
  { key: 'booked',      label: 'Booked',       color: 'bg-purple-500' },
  { key: 'scheduled',   label: 'Scheduled',    color: 'bg-indigo-500' },
  { key: 'in_progress', label: 'In Progress',  color: 'bg-cyan-500' },
  { key: 'completed',   label: 'Completed',    color: 'bg-green-500' },
  { key: 'invoiced',    label: 'Invoiced',     color: 'bg-teal-500' },
  { key: 'review_sent', label: 'Review Sent',  color: 'bg-emerald-500' },
  { key: 'paid',        label: 'Paid',         color: 'bg-green-700' },
  { key: 'lost',        label: 'Lost',         color: 'bg-red-500' },
]

export const LEAD_SOURCES: { key: LeadSource; label: string }[] = [
  { key: 'facebook_ad',   label: 'Facebook Ad' },
  { key: 'door_hanger',   label: 'Door Hanger' },
  { key: 'word_of_mouth', label: 'Word of Mouth' },
  { key: 'd2d',           label: 'Door-to-Door' },
  { key: 'referral',      label: 'Referral' },
  { key: 'other',         label: 'Other' },
]

export const DOOR_STATUSES: { key: DoorStatus; label: string; color: string; mapColor: string }[] = [
  { key: 'not_home',       label: 'Not Home',       color: 'bg-gray-500',   mapColor: '#6b7280' },
  { key: 'not_interested', label: 'Not Interested', color: 'bg-red-500',    mapColor: '#ef4444' },
  { key: 'interested',     label: 'Interested',     color: 'bg-yellow-400', mapColor: '#facc15' },
  { key: 'quoted',         label: 'Quoted',         color: 'bg-blue-500',   mapColor: '#3b82f6' },
  { key: 'booked',         label: 'Booked',         color: 'bg-green-500',  mapColor: '#22c55e' },
]

export const PRESSURE_WASH_SURFACES = [
  { key: 'concrete_driveway', label: 'Concrete Driveway',  price_per_sqft: 0.20 },
  { key: 'sidewalk',          label: 'Sidewalk/Walkway',   price_per_sqft: 0.20 },
  { key: 'patio_concrete',    label: 'Patio (Concrete)',   price_per_sqft: 0.22 },
  { key: 'deck_wood',         label: 'Deck (Wood)',        price_per_sqft: 0.28 },
  { key: 'fence',             label: 'Fence',              price_per_sqft: 0.25 },
  { key: 'house_exterior',    label: 'House Exterior',     price_per_sqft: 0.20 },
]

export const SOFT_WASH_SURFACES = [
  { key: 'house_exterior_sw', label: 'House Exterior',     price_per_sqft: 0.30 },
  { key: 'fence_sw',          label: 'Fence',              price_per_sqft: 0.28 },
  { key: 'patio_deck_sw',     label: 'Patio/Deck',         price_per_sqft: 0.25 },
]

export const SOFTWASH_SIDING_TYPES = [
  { key: 'vinyl',   label: 'Vinyl Siding',  price_per_sqft: 0.30 },
  { key: 'brick',   label: 'Brick',         price_per_sqft: 0.22 },
  { key: 'stucco',  label: 'Stucco',        price_per_sqft: 0.28 },
  { key: 'wood',    label: 'Wood Siding',   price_per_sqft: 0.32 },
]

export const STORY_HEIGHT: Record<number, number> = { 1: 10, 2: 20, 3: 30 }

export const SOFTWASH_ADDONS = [
  { key: 'gutters',        label: 'Gutter Brightening',  flat_price: 60 },
  { key: 'driveway_rinse', label: 'Driveway Rinse-Down', flat_price: 40 },
]

export const WINDOW_TYPES = [
  { key: 'standard',      label: 'Standard Window',   exterior_price: 6,  interior_multiplier: 1.6 },
  { key: 'large_picture', label: 'Large/Picture',      exterior_price: 12, interior_multiplier: 1.6 },
  { key: 'french_door',   label: 'French Door',        exterior_price: 15, interior_multiplier: 1.6 },
]

export const JOB_MINIMUM = 129

export const BUNDLE_DISCOUNT_PER_SERVICE = 0.05

export const WEATHER_ZIP_CODES = ['62298']

export const FOLLOW_UP_DAYS = 3

export const SERVICE_AREA_RADIUS_MILES = 40

export const TEXT_TEMPLATES = {
  booking_confirmation: `Hi [NAME]! This is Jaxen from Scrub-A-Dub Home Services. Just confirming you're booked for [DATE] at [TIME]. Total: $[PRICE]. See you then! Any questions? 636-281-6111`,
  day_before_reminder: `Hi [NAME]! Quick reminder from Scrub-A-Dub — we're scheduled for tomorrow, [DATE] at [TIME]. See you then! 636-281-6111`,
  morning_of: `Good morning [NAME]! Jaxen from Scrub-A-Dub here — we're on for today at [TIME]. Looking forward to it! 636-281-6111`,
  review_request: `Hi [NAME]! It was great working with you today. If you're happy with the results, we'd really appreciate a quick Google review — it helps us out a ton! [GOOGLE_REVIEW_LINK] Thanks! - Jaxen, Scrub-A-Dub`,
  follow_up: `Hey [NAME]! This is Jaxen from Scrub-A-Dub Home Services. Just following up on your quote — still interested in getting those [SERVICES] taken care of? Give me a call or text at 636-281-6111!`,
  invoice: `Hi [NAME]! Your invoice from Scrub-A-Dub Home Services for $[PRICE] is attached. Thanks for your business! Questions? 636-281-6111`,
}
