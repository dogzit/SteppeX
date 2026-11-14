import { create } from 'zustand';
export const useNotice = create<{ text: string; id: number }>(() => ({ text: '', id: 0 }));
/** UI feedback survives a panel/view change, including asynchronous clipboard failures. */
export function announce(text: string) {
  const id = useNotice.getState().id + 1;
  useNotice.setState({ text, id });
  setTimeout(() => { if (useNotice.getState().id === id) useNotice.setState({ text: '' }); }, 8000);
}
