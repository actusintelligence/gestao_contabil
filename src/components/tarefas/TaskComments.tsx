import { useEffect, useState } from 'react';
import { MessageSquare, Send, Trash2, Edit2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Database } from '../../lib/database.types';
import { formatDateTimeBR } from '../../utils/dateUtils';

type TaskComment = Database['public']['Tables']['task_comments']['Row'];

interface TaskCommentsProps {
  tarefaId: string;
}

export function TaskComments({ tarefaId }: TaskCommentsProps) {
  const { user, tenantUser } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    loadComments();
  }, [tarefaId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('tarefa_id', tarefaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('task_comments').insert([
        {
          tarefa_id: tarefaId,
          user_id: user.id,
          conteudo: newComment.trim(),
        },
      ]);

      if (error) throw error;
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      alert('Erro ao adicionar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingText.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('task_comments')
        .update({ conteudo: editingText.trim(), updated_at: new Date().toISOString() })
        .eq('id', commentId);

      if (error) throw error;
      setEditingId(null);
      setEditingText('');
      await loadComments();
    } catch (error) {
      console.error('Erro ao editar comentário:', error);
      alert('Erro ao editar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Tem certeza que deseja deletar este comentário?')) return;

    try {
      const { error } = await supabase.from('task_comments').delete().eq('id', commentId);

      if (error) throw error;
      await loadComments();
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
      alert('Erro ao deletar comentário');
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Carregando comentários...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Comentários</h3>
        <span className="text-sm text-gray-500">({comments.length})</span>
      </div>

      <form onSubmit={handleSubmitComment} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Adicione um comentário..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhum comentário ainda</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          disabled={submitting}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditingText('');
                          }}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-900 break-words">{comment.conteudo}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTimeBR(comment.created_at)}
                        {comment.updated_at && ' (editado)'}
                      </p>
                    </>
                  )}
                </div>
                {user?.id === comment.user_id && editingId !== comment.id && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditingText(comment.conteudo);
                      }}
                      className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar comentário"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Deletar comentário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
