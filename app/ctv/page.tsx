import Navbar from '@/components/Navbar';

export default function CTVPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard CTV</h1>
          <p className="text-gray-600 mt-1">Gestion des trains et du personnel</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Trains en circulation</p>
            <p className="text-2xl font-bold text-gray-900">7</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Équipages disponibles</p>
            <p className="text-2xl font-bold text-gray-900">14</p>
          </div>
        </div>
      </div>
    </div>
  );
}