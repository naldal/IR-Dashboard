import { NextResponse } from 'next/server';

export function routeErrorResponse(route: string, error: unknown) {
  console.error(`[${route}]`, error);

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : 'failed',
    },
    { status: 500 }
  );
}
