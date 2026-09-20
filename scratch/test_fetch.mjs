import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkResource() {
  const resourceId = 'bbfcbf7f-91e9-456b-b09e-54f8f83cccf1';
  
  const { data: resource, error: resourceError } = await supabase
    .from('resources')
    .select('*')
    .eq('id', resourceId)
    .single();
    
  console.log("Resource:", resource, "Error:", resourceError);
  
  const { data: segments, error: segmentsError } = await supabase
    .from('video_segments')
    .select('*')
    .eq('resource_id', resourceId);
    
  console.log("Segments count:", segments?.length, "Error:", segmentsError);
}

checkResource();
