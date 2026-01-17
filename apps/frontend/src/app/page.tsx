export default function Home() {
    return (
        <main
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
            }}
        >
            <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                SubscriberNest
            </h1>
            <p style={{ fontSize: '1.125rem', color: '#737373' }}>
                Connect to your ESP, sync your subscriber list, and export anytime.
            </p>
        </main>
    );
}
