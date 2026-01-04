// Titles data - stores information for all available titles
const TITLES_DATA = {
  'stranger-things': {
    id: 'stranger-things',
    title: 'Stranger Things',
    type: 'TV Show',
    year: 2016,
    rating: 'TV-14',
    match: 98,
    seasons: 4,
    quality: 'HD',
    description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    backgroundGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    backgroundImage: null,
    episodes: [
      {
        number: 1,
        title: 'Chapter One: The Hellfire Club',
        description: 'Six months after the Battle of Starcourt, a new horror begins to surface in Hawkins. Meanwhile, the Byers adjust to life in California.',
        duration: '1h 18m',
        thumbnail: null
      },
      {
        number: 2,
        title: 'Chapter Two: Vecna\'s Curse',
        description: 'As the death toll rises, panic spreads through Hawkins. Max struggles with survivor\'s guilt, while Eleven faces harsh truths.',
        duration: '1h 15m',
        thumbnail: null
      },
      {
        number: 3,
        title: 'Chapter Three: The Monster and the Superhero',
        description: 'Dustin and Steve make a discovery in the Upside Down. Joyce receives a mysterious package. Eleven struggles with her past.',
        duration: '1h 19m',
        thumbnail: null
      }
    ],
    currentSeason: 4,
    totalSeasons: 4,
    similarTitles: [
      {
        title: 'Dark',
        year: 2017,
        rating: 'TV-MA',
        seasons: 3
      },
      {
        title: 'The Umbrella Academy',
        year: 2019,
        rating: 'TV-14',
        seasons: 3
      },
      {
        title: 'Locke & Key',
        year: 2020,
        rating: 'TV-14',
        seasons: 3
      }
    ]
  },
  'pinoy-big-brother': {
    id: 'pinoy-big-brother',
    title: 'Pinoy Big Brother',
    type: 'Reality Show',
    year: 2024,
    rating: 'TV-PG',
    match: 95,
    seasons: 1,
    quality: 'HD',
    description: 'Reality Show that explores how individuals interact and socialize in a one house. This test the honesty and social skill of the person. Discover the journey of roblox users on how they face every challenges and tasks given by Big Brother.',
    backgroundGradient: 'linear-gradient(135deg, #991b1b 0%, #1e293b 50%, #020617 100%)',
    backgroundImage: '../pbblogo.png',
    episodes: [
      {
        number: 1,
        title: 'Episode 1: The Beginning',
        description: 'Contestants enter the house and meet for the first time. Big Brother introduces the rules and first challenge.',
        duration: '45m',
        thumbnail: null
      },
      {
        number: 2,
        title: 'Episode 2: First Challenge',
        description: 'The first major challenge tests the contestants\' teamwork and strategy. Alliances begin to form.',
        duration: '42m',
        thumbnail: null
      }
    ],
    currentSeason: 1,
    totalSeasons: 1,
    similarTitles: [
      {
        title: 'Big Brother',
        year: 2000,
        rating: 'TV-14',
        seasons: 24
      },
      {
        title: 'Survivor',
        year: 2000,
        rating: 'TV-PG',
        seasons: 45
      }
    ]
  }
};

// Helper function to get title by ID or slug
function getTitleById(id) {
  return TITLES_DATA[id] || null;
}

// Helper function to get all titles (for listing)
function getAllTitles() {
  return Object.values(TITLES_DATA);
}

