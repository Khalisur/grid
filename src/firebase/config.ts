import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
	apiKey: 'AIzaSyCWxPgGI_OqYAR72ytWc-Z7WEBvd9blTmM',
	authDomain: 'grid-map-69bbc.firebaseapp.com',
	projectId: 'grid-map-69bbc',
	storageBucket: 'grid-map-69bbc.firebasestorage.app',
	messagingSenderId: '286589761644',
	appId: '1:286589761644:web:b7a393b4ac1d7369f14049',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export default app
