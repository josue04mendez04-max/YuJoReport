// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB6YNzBMN3c4kM2T11nt3iJC9XwLwzWmUI",
  authDomain: "easyrep-a1.firebaseapp.com",
  projectId: "easyrep-a1",
  storageBucket: "easyrep-a1.firebasestorage.app",
  messagingSenderId: "669667654952",
  appId: "1:669667654952:web:9f3879de1dc54e4dd4a41d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Habilitar persistencia offline de Firebase (IndexedDB) - Usando nueva API
try {
    await enableIndexedDbPersistence(db);
    console.log('✅ Persistencia offline habilitada');
} catch (err) {
    if (err.code == 'failed-precondition') {
        console.log('⚠️ Persistencia falló: Múltiples pestañas abiertas.');
    } else if (err.code == 'unimplemented') {
        console.log('⚠️ El navegador no soporta persistencia offline.');
    }
}

export { app, db };

/**
 * Obtener el nombre de la iglesia desde Firestore
 */
export async function getChurchNameFromDB(churchId) {
    if (!churchId) return 'Yujo Report';
    
    try {
        // Intenta en colección 'iglesias'
        const churchRef = doc(db, 'iglesias', churchId);
        const churchSnap = await getDoc(churchRef);
        if (churchSnap.exists() && churchSnap.data().nombre) {
            console.log('✅ Nombre de iglesia obtenido de iglesias:', churchSnap.data().nombre);
            return churchSnap.data().nombre;
        }
        
        // Fallback: Intenta obtener de church_data como fallback
        // (Si la iglesia está en church_data pero no en iglesias)
        try {
            const churchDataRef = doc(db, 'church_data', churchId);
            const churchDataSnap = await getDoc(churchDataRef);
            if (churchDataSnap.exists() && churchDataSnap.data().nombreIglesia) {
                console.log('✅ Nombre obtenido de church_data:', churchDataSnap.data().nombreIglesia);
                return churchDataSnap.data().nombreIglesia;
            }
        } catch (e) {
            // Ignorar error de church_data
        }
        
        console.log('⚠️ Iglesia no encontrada en DB, usando ID:', churchId);
        return churchId;
    } catch (error) {
        console.warn('⚠️ Error obteniendo nombre de iglesia:', error);
        return churchId;
    }
}
