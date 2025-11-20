import { supabase } from "@/integrations/supabase/client";

export async function generateAndSaveLogo(): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-logo');
    
    if (error) throw error;
    if (!data?.imageUrl) throw new Error('No image URL returned');
    
    return data.imageUrl;
  } catch (error) {
    console.error('Error generating logo:', error);
    throw error;
  }
}
