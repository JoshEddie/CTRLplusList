import { NextResponse } from 'next/server';

// Set this to false to use the real Google API
const USE_MOCK_DATA = false;

// Mock data for testing
const mockImages = [
  {
    title: 'Placeholder Image 1',
    link: 'https://placehold.co/300x300/4F46E5/FFFFFF/png?text=Image+1',
    image: {
      byteSize: 1024,
      contextLink: 'https://placehold.co',
      height: 300,
      thumbnailLink: 'https://placehold.co/150x150/4F46E5/FFFFFF/png?text=1',
      width: 300
    }
  },
  {
    title: 'Placeholder Image 2',
    link: 'https://placehold.co/300x300/7C3AED/FFFFFF/png?text=Image+2',
    image: {
      byteSize: 1024,
      contextLink: 'https://placehold.co',
      height: 300,
      thumbnailLink: 'https://placehold.co/150x150/7C3AED/FFFFFF/png?text=2',
      width: 300
    }
  },
  {
    title: 'Placeholder Image 3',
    link: 'https://placehold.co/300x300/10B981/FFFFFF/png?text=Image+3',
    image: {
      byteSize: 1024,
      contextLink: 'https://placehold.co',
      height: 300,
      thumbnailLink: 'https://placehold.co/150x150/10B981/FFFFFF/png?text=3',
      width: 300
    }
  },
  {
    title: 'Placeholder Image 4',
    link: 'https://placehold.co/300x300/F59E0B/FFFFFF/png?text=Image+4',
    image: {
      byteSize: 1024,
      contextLink: 'https://placehold.co',
      height: 300,
      thumbnailLink: 'https://placehold.co/150x150/F59E0B/FFFFFF/png?text=4',
      width: 300
    }
  },
  {
    title: 'Placeholder Image 5',
    link: 'https://placehold.co/300x300/EF4444/FFFFFF/png?text=Image+5',
    image: {
      byteSize: 1024,
      contextLink: 'https://placehold.co',
      height: 300,
      thumbnailLink: 'https://placehold.co/150x150/EF4444/FFFFFF/png?text=5',
      width: 300
    }
  },
  {
    title: 'Placeholder Image 6',
    link: 'https://placehold.co/300x300/8B5CF6/FFFFFF/png?text=Image+6',
    image: {
      byteSize: 1024,
      contextLink: 'https://placehold.co',
      height: 300,
      thumbnailLink: 'https://placehold.co/150x150/8B5CF6/FFFFFF/png?text=6',
      width: 300
    }
  },
  {
    title: 'Placeholder Image 7',
    link: 'https://placehold.co/300x300/EC4899/FFFFFF/png?text=Image+7',
    image: {
      byteSize: 1024,
      contextLink: 'https://placehold.co',
      height: 300,
      thumbnailLink: 'https://placehold.co/150x150/EC4899/FFFFFF/png?text=7',
      width: 300
    }
  },
  {
    title: 'Placeholder Image 8',
    link: 'https://placehold.co/300x300/3B82F6/FFFFFF/png?text=Image+8',
    image: {
      byteSize: 1024,
      contextLink: 'https://placehold.co',
      height: 300,
      thumbnailLink: 'https://placehold.co/150x150/3B82F6/FFFFFF/png?text=8',
      width: 300
    }
  },
  {
    title: 'Placeholder Image 9',
    link: 'https://placehold.co/300x300/10B981/FFFFFF/png?text=Image+9',
    image: {
      byteSize: 1024,
      contextLink: 'https://placehold.co',
      height: 300,
      thumbnailLink: 'https://placehold.co/150x150/10B981/FFFFFF/png?text=9',
      width: 300
    }
  },
  {
    title: 'Placeholder Image 10',
    link: 'https://placehold.co/300x300/F59E0B/FFFFFF/png?text=Image+10',
    image: {
      byteSize: 1024,
      contextLink: 'https://placehold.co',
      height: 300,
      thumbnailLink: 'https://placehold.co/150x150/F59E0B/FFFFFF/png?text=10',
      width: 300
    }
  }
];

export async function GET(request: Request) {
  // Use mock data if enabled
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock data in the same format as the Google API
    return NextResponse.json({
      items: mockImages,
      searchInformation: {
        searchTime: 0.5,
        formattedSearchTime: "0.5",
        totalResults: "10",
        formattedTotalResults: "10"
      },
      queries: {
        request: [{
          title: "Google Custom Search - Test Query",
          totalResults: "10",
          searchTerms: "test",
          count: 10,
          startIndex: 1,
          inputEncoding: "utf8",
          outputEncoding: "utf8",
          safe: "active",
          searchType: "image"
        }]
      },
      context: {
        title: "Test Search"
      }
    });
  }

  // Real Google API implementation
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
  
  if (!apiKey || !cx) {
    console.error('Missing Google Custom Search API configuration');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.append('key', apiKey);
    url.searchParams.append('cx', cx);
    url.searchParams.append('q', query);
    url.searchParams.append('searchType', 'image');
    url.searchParams.append('num', '10');
    url.searchParams.append('safe', 'active');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch images from Google' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to process image search' },
      { status: 500 }
    );
  }
}
