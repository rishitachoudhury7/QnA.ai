import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from('video_segments').insert({
    resource_id: 'c163eb00-4084-4990-9db0-3e8498c084f2', // some random uuid
    start_seconds: 0,
    end_seconds: 10,
    text: 'Test text',
    embedding: new Array(768).fill(0) // Assuming embedding dimension is 768
  });

  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Insert Success:", data);
    // Cleanup
    await supabase.from('video_segments').delete().eq('resource_id', 'c163eb00-4084-4990-9db0-3e8498c084f2');
  }
}

testInsert();
