import Link from 'next/link';

export default function HomePage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="space-y-2">
                    <h1 className="text-5xl font-bold text-primary-900 dark:text-white">
                        Safe-Scan Lite
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-300">
                        Securely decode QR codes from images
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">
                            Welcome
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            Upload QR code images and get safe, decoded results
                        </p>
                    </div>

                    <Link
                        href="/scan"
                        className="inline-block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                    >
                        Start Scanning →
                    </Link>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            ✓ Supports PNG, JPG, WebP
                            <br />
                            ✓ Max file size: 5MB
                            <br />
                            ✓ No data stored
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
