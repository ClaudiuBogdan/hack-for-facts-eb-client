export function ErrorDisplay({ error, refetch }: { error: Error, refetch: () => void }) {
    return <div className="p-4 text-red-600">
        Error loading options: {(error as Error).message}
        <button onClick={() => refetch()} className="ml-2 underline">
            Retry
        </button>
    </div>
}