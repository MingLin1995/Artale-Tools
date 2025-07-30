import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://artale-market.org/api/price-snapshots?date=latest&currency=meso', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching from Artale Market API: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy Error]', error);
    return NextResponse.json({ message: 'Error fetching data from external API' }, { status: 500 });
  }
}
