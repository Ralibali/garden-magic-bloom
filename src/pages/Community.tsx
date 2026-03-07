import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const posts = [
  {
    name: 'Maria L.',
    avatar: '👩‍🌾',
    time: '5 timmar sedan',
    content: 'Förodlade tomaterna i miniväxthus i år och wow vilken skillnad! Dubbelt så starka plantor jämfört med fönsterbrädan. 🍅',
    likes: 12,
    comments: 4,
  },
  {
    name: 'Erik B.',
    avatar: '👨‍🌾',
    time: 'Igår',
    content: 'Tips: Så rädisor mellan raderna med morötter – rädisorna kommer upp fort och markerar var morotsraderna är. Plus extra skörd! 🥕',
    likes: 24,
    comments: 7,
  },
];

const Community = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif text-foreground">Community 🤝</h1>
        <p className="text-sm text-muted-foreground mt-1">Dela tips och erfarenheter med andra odlare</p>
      </div>
      <div className="space-y-4">
        {posts.map((post, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{post.avatar}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{post.name}</p>
                  <p className="text-xs text-muted-foreground">{post.time}</p>
                </div>
              </div>
              <p className="text-sm text-foreground/90">{post.content}</p>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>❤️ {post.likes}</span>
                <span>💬 {post.comments}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">Community kommer snart – håll utkik!</p>
    </div>
  );
};

export default Community;
