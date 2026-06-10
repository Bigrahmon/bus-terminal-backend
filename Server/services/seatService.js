import { supabase } from '../config/supabase.js';

/**
 * Releases all seat holds that have expired.
 * A hold expires if 'held_until' is in the past.
 */
export const releaseExpiredHolds = async () => {
  try {
    // Update seats where status = 'held' and held_until < NOW()
    const { data, error } = await supabase
      .from('seats')
      .update({
        status: 'available',
        held_until: null,
        held_by: null
      })
      .eq('status', 'held')
      .lt('held_until', new Date().toISOString())
      .select();

    if (error) {
      console.error('Error releasing expired seat holds:', error);
      return false;
    }

    if (data && data.length > 0) {
      console.log(`Released ${data.length} expired seat holds.`);
    }
    
    return true;
  } catch (err) {
    console.error('Server error during seat release:', err);
    return false;
  }
};
