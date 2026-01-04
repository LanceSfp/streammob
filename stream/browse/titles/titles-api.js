// Titles API - Fetches data from Supabase instead of hardcoded data
let supabaseClient = null;

function initSupabaseClient() {
  if (!supabaseClient && typeof initSupabase === 'function') {
    supabaseClient = initSupabase();
  }
  return supabaseClient;
}

// Fetch all titles
async function getAllTitles() {
  const supabase = initSupabaseClient();
  if (!supabase) {
    console.error('Supabase not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('titles')
      .select('*')
      .order('title', { ascending: true });

    if (error) {
      console.error('Error fetching titles:', error);
      return [];
    }

    // Transform data to match existing format
    return data.map(title => ({
      id: title.id,
      title: title.title,
      type: title.type,
      year: title.year,
      rating: title.rating,
      match: title.match,
      seasons: title.seasons,
      quality: title.quality,
      description: title.description,
      backgroundGradient: title.background_gradient,
      backgroundImage: title.background_image,
      currentSeason: title.current_season,
      totalSeasons: title.total_seasons
    }));
  } catch (error) {
    console.error('Error in getAllTitles:', error);
    return [];
  }
}

// Fetch a single title by ID with episodes
async function getTitleById(id) {
  const supabase = initSupabaseClient();
  if (!supabase) {
    console.error('Supabase not initialized');
    return null;
  }

  try {
    // Fetch title
    const { data: titleData, error: titleError } = await supabase
      .from('titles')
      .select('*')
      .eq('id', id)
      .single();

    if (titleError || !titleData) {
      console.error('Error fetching title:', titleError);
      return null;
    }

    // Fetch episodes
    const { data: episodesData, error: episodesError } = await supabase
      .from('episodes')
      .select('*')
      .eq('title_id', id)
      .order('season_number', { ascending: true })
      .order('episode_number', { ascending: true });

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
    }

    // Fetch similar titles
    const { data: similarData, error: similarError } = await supabase
      .from('similar_titles')
      .select('*')
      .eq('title_id', id);

    if (similarError) {
      console.error('Error fetching similar titles:', similarError);
    }

    // Transform to match existing format
    return {
      id: titleData.id,
      title: titleData.title,
      type: titleData.type,
      year: titleData.year,
      rating: titleData.rating,
      match: titleData.match,
      seasons: titleData.seasons,
      quality: titleData.quality,
      description: titleData.description,
      backgroundGradient: titleData.background_gradient,
      backgroundImage: titleData.background_image,
      currentSeason: titleData.current_season,
      totalSeasons: titleData.total_seasons,
      episodes: (episodesData || []).map(ep => ({
        number: ep.episode_number,
        title: ep.title,
        description: ep.description,
        duration: ep.duration,
        thumbnail: ep.thumbnail,
        src: ep.video_src,
        page: ep.page_url,
        season: ep.season_number
      })),
      similarTitles: (similarData || []).map(st => ({
        title: st.similar_title,
        year: st.year,
        rating: st.rating,
        seasons: st.seasons
      }))
    };
  } catch (error) {
    console.error('Error in getTitleById:', error);
    return null;
  }
}

// Export functions (for use in other scripts)
if (typeof window !== 'undefined') {
  window.titlesAPI = {
    getAllTitles,
    getTitleById
  };
}

