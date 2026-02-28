import type { ReactNode, FormEvent } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  error?: string | null;
  children: ReactNode;
  onSubmit?: (e: FormEvent) => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  submitPending?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  error,
  children,
  onSubmit,
  submitLabel = 'Submit',
  submitDisabled,
  submitPending,
}: ModalProps) {
  if (!open) return null;

  const content = (
    <>
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
        {error && (
          <div className="mt-2 p-2 bg-red-50 text-red-600 text-sm rounded">
            {error}
          </div>
        )}
        <div className="mt-4">{children}</div>
      </div>
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
        <button
          type={onSubmit ? 'submit' : 'button'}
          disabled={submitDisabled || submitPending}
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
        >
          {submitPending ? `${submitLabel}...` : submitLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
        >
          Cancel
        </button>
      </div>
    </>
  );

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          role="presentation"
        />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {onSubmit ? (
            <form onSubmit={onSubmit}>{content}</form>
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );
}
