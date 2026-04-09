import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Trash2, Loader2, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface BlogCommentsProps {
  postId: string;
}

export default function BlogComments({ postId }: BlogCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['blog-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('blog_comments').insert({
        post_id: postId,
        user_id: user!.id,
        display_name: user!.name || 'Anonym',
        content: content.trim(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['blog-comments', postId] });
      toast({ title: 'Kommentar tillagd!' });
    },
    onError: () => toast({ title: 'Kunde inte lägga till kommentar', variant: 'destructive' }),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('blog_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments', postId] });
      toast({ title: 'Kommentar borttagen' });
    },
  });

  return (
    <div className="mt-12 pt-8 border-t border-border/50">
      <h3 className="font-serif text-lg text-foreground mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        Kommentarer ({comments.length})
      </h3>

      {/* Comment list */}
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-6">Inga kommentarer ännu. Var den första!</p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((c: any) => (
            <div key={c.id} className="bg-muted/30 rounded-xl p-4 group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{c.display_name || 'Anonym'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {user && (user.id === c.user_id) && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteComment.mutate(c.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-foreground/90">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      {isAuthenticated ? (
        <div className="space-y-2">
          <Label htmlFor="blog-comment" className="sr-only">Skriv en kommentar</Label>
          <Textarea
            id="blog-comment"
            placeholder="Skriv en kommentar..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="rounded-xl resize-none"
            rows={3}
          />
          <Button
            onClick={() => addComment.mutate()}
            disabled={!content.trim() || addComment.isPending}
            className="rounded-xl gap-1.5"
            size="sm"
          >
            {addComment.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Kommentera
          </Button>
        </div>
      ) : (
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <LogIn className="h-4 w-4" /> Logga in för att kommentera
        </Link>
      )}
    </div>
  );
}
