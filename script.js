import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDecxXNg2dcSM0rCPN_avxapxCXHfxXOSw",
    authDomain: "metroplaza-13b5e.firebaseapp.com",
    projectId: "metroplaza-13b5e",
    storageBucket: "metroplaza-13b5e.firebasestorage.app",
    messagingSenderId: "958136196486",
    appId: "1:958136196486:web:28292dcd6cd5f2bbfae007"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let currentUserRole = "guard";
let printCharacteristic = null;

// --- ACCESS LOGIC ---
window.showAdminLogin = () => { 
    document.getElementById('role-selection').style.display='none'; 
    document.getElementById('admin-login').style.display='block'; 
};

window.enterRole = (role) => { 
    currentUserRole = role; 
    loginSuccess(); 
};

window.verifyAdmin = () => { 
    if(document.getElementById('pass').value === "0526") { 
        currentUserRole = 'admin'; 
        loginSuccess(); 
    } else { 
        alert("Wrong PIN"); 
    } 
};

function loginSuccess() {
    document.getElementById('user-role-tag').innerText = currentUserRole.toUpperCase() + " MODE";
    document.querySelectorAll('.admin-only').forEach(e => e.style.display = (currentUserRole === 'admin' ? 'block' : 'none'));
    document.querySelectorAll('.guard-only').forEach(e => e.style.display = (currentUserRole === 'guard' ? 'block' : 'none'));
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('sidebar').style.display = 'flex';
    document.getElementById('main-content').style.display = 'block';
}

// --- BLUETOOTH PRINTING ---
window.connectBluetooth = async () => {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['0000ff00-0000-1000-8000-00805f9b34fb'] }],
            optionalServices: ['0000ff00-0000-1000-8000-00805f9b34fb']
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb');
        printCharacteristic = await service.getCharacteristic('0000ff01-0000-1000-8000-00805f9b34fb');
        alert("Bluetooth Printer Connected! 🖨️");
    } catch (e) { alert("Bluetooth Error: " + e.message); }
};

async function printReceipt(plate, inT, outT, pay) {
    if (!printCharacteristic) { alert("Connect Printer First!"); return; }
    const text = `\n   METRO PLAZA\n   Bagong Silang\n----------------\nPLATE: ${plate}\nIN:    ${inT}\nOUT:   ${outT}\nTOTAL: P${pay}.00\n----------------\n  Drive Safely!\n\n\n\n`;
    const encoder = new TextEncoder();
    await printCharacteristic.writeValue(encoder.encode(text));
}

// --- CORE ACTIONS ---
window.kioskCheckIn = async () => {
    const p = document.getElementById('kioskPlate').value.trim().toUpperCase();
    if(!p || p === "UNDEFINED") return;
    await setDoc(doc(db, "active_parking", p), { 
        plate: p, 
        entryTime: new Date().toLocaleTimeString(), 
        rawIn: Date.now(), 
        date: new Date().toLocaleDateString() 
    });
    document.getElementById('kiosk-feedback').innerHTML = "✅ Registered!";
    document.getElementById('kioskPlate').value = "";
    setTimeout(() => document.getElementById('kiosk-feedback').innerHTML = "", 2000);
};

window.checkOut = async (plate) => {
    const snap = await getDocs(collection(db, "active_parking"));
    const data = snap.docs.find(d => d.id === plate)?.data();
    if(!data) return;
    const outT = new Date().toLocaleTimeString();
    const hrs = Math.ceil((Date.now() - data.rawIn) / (1000 * 60 * 60));
    const pay = hrs > 4 ? 20 + ((hrs - 4) * 5) : 20;

    await printReceipt(plate, data.entryTime, outT, pay);
    await addDoc(collection(db, "parking_history"), { ...data, out: outT });
    await addDoc(collection(db, "sales_report"), { plate, pay, date: data.date });
    await deleteDoc(doc(db, "active_parking", plate));
};

// --- DATA LISTENERS ---
onSnapshot(collection(db, "active_parking"), snap => {
    let h = "";
    snap.forEach(d => {
        const r = d.data();
        if(r.plate && r.plate !== "undefined" && r.plate !== "") {
            h += `<tr><td><b>${r.plate}</b></td><td>${r.entryTime}</td><td><span style="color:green">● PARKED</span></td><td>${r.date}</td><td><button class="btn-release" onclick="checkOut('${r.plate}')">RELEASE</button></td></tr>`;
        }
    });
    document.getElementById('table-dash').innerHTML = h;
});

onSnapshot(collection(db, "sales_report"), snap => {
    let g = 0, t = 0, h = "";
    const today = new Date().toLocaleDateString();
    snap.forEach(d => {
        const r = d.data();
        if(r.plate && r.pay) {
            const p = Number(r.pay); g += p;
            if(r.date === today) t += p;
            h = `<tr><td>${r.plate}</td><td>P${p}.00</td><td>${r.date}</td><td><button class="btn-delete" onclick="deleteDoc(doc(db,'sales_report','${d.id}'))">Del</button></td></tr>` + h;
        }
    });
    document.getElementById('table-sale').innerHTML = h;
    document.getElementById('grand-total').innerText = "P" + g.toFixed(2);
    document.getElementById('today-total').innerText = "P" + t.toFixed(2);
});

// --- UI HELPERS ---
window.filterTable = () => {
    let q = document.getElementById("searchInput").value.toUpperCase();
    document.querySelectorAll("#table-dash tr").forEach(r => r.style.display = r.cells[0].innerText.includes(q) ? "" : "none");
};

window.showTab = (id, el) => {
    document.querySelectorAll('.tab-view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
};

window.enterKiosk = () => document.getElementById('kiosk-view').style.display = 'flex';
window.exitKiosk = () => document.getElementById('kiosk-view').style.display = 'none';

setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleString(), 1000);
