import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NFL Elo Ratings — Weekly Win Probabilities & QB Ratings | Sweeney Town',
  description:
    "A continuation of FiveThirtyEight's retired NFL Elo model, rebuilt from their published source and re-fit on modern seasons. Team ratings, per-game win probabilities, quarterback adjustments, and live scores for every week.",
  keywords: [
    'NFL Elo ratings',
    'NFL win probability',
    'FiveThirtyEight Elo model',
    'NFL power rankings',
    'quarterback Elo adjustment',
    'NFL game predictions',
    'NFL model spread',
    'QB VALUE rating',
  ],
  openGraph: {
    title: 'NFL Elo Ratings — Weekly Win Probabilities & QB Ratings',
    description:
      "FiveThirtyEight's NFL Elo model, continued and re-fit: team ratings, per-game win probabilities, quarterback adjustments, and live scores.",
    type: 'website',
  },
};

export default function NflEloLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
