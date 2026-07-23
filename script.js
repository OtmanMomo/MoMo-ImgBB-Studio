let apis = JSON.parse(localStorage.getItem("imgbb_apis")) || [];

let selectedFiles = [];

let uploadedLinks = [];

let uploadCounter = 0;

// تحميل API عند فتح الموقع
window.onload = () => {
    renderAPIs();
    updateStats();
};

// إضافة API جديد
function addAPI(){
    let name = document.getElementById("apiName").value.trim();
    let key = document.getElementById("apiKey").value.trim();

    if(!name || !key){
        alert("أدخل اسم الحساب و API Key");
        return;
    }

    if(key.length < 20){
        alert("API Key يبدو غير صحيح (أقصر من 20 حرف)");
        return;
    }

    apis.push({
        name: name,
        key: key,
        uploads: 0
    });

    saveAPIs();
    document.getElementById("apiName").value = "";
    document.getElementById("apiKey").value = "";
    showMessage("✅ تمت إضافة API بنجاح");
}

function saveAPIs(){
    localStorage.setItem(
        "imgbb_apis",
        JSON.stringify(apis)
    );
    renderAPIs();
    updateStats();
}

// عرض الحسابات
function renderAPIs(){
    let box = document.getElementById("apiList");
    box.innerHTML = "";

    if(apis.length === 0){
        box.innerHTML = "<p style='color:#aaa; text-align:center;'>لا توجد حسابات - أضف حساب أولاً</p>";
        
        let select = document.getElementById("apiSelect");
        if(select) select.style.display = "none";
        return;
    }

    let select = document.getElementById("apiSelect");
    if(select){
        select.innerHTML = "";
        apis.forEach((api, index) => {
            let option = document.createElement("option");
            option.value = index;
            option.textContent = `${api.name} (${api.uploads} صورة)`;
            select.appendChild(option);
        });
        select.style.display = "block";
    }

    apis.forEach((api, index) => {
        let hidden = api.key.substring(0,5) + "********" + api.key.slice(-4);

        box.innerHTML += `
            <div class="api-box">
                <div>
                    <b>${api.name}</b><br>
                    🔑 ${hidden}<br>
                    📷 ${api.uploads} صورة
                </div>
                <button onclick="removeAPI(${index})" class="delete-btn">
                    حذف
                </button>
            </div>
        `;
    });
}

function removeAPI(index){
    if(confirm("حذف هذا الحساب؟")){
        apis.splice(index, 1);
        saveAPIs();
        showMessage("✅ تم حذف الحساب");
    }
}

// اختيار الصور
document
    .getElementById("fileInput")
    .addEventListener("change", e => {
        selectedFiles = Array.from(e.target.files);
        showPreview();
    });

// Drag & Drop
let drop = document.getElementById("dropArea");

drop.addEventListener("dragover", e => {
    e.preventDefault();
    drop.classList.add("active");
});

drop.addEventListener("dragleave", () => {
    drop.classList.remove("active");
});

drop.addEventListener("drop", e => {
    e.preventDefault();
    drop.classList.remove("active");
    selectedFiles = Array.from(e.dataTransfer.files);
    showPreview();
});

// معاينة الصور
function showPreview(){
    let box = document.getElementById("preview");
    box.innerHTML = "";

    selectedFiles.forEach((file, index) => {
        if(!file.type.startsWith("image/")){
            showMessage("⚠️ يجب اختيار صور فقط");
            selectedFiles.splice(index, 1);
            return;
        }

        let url = URL.createObjectURL(file);
        let size = (file.size / 1024).toFixed(2);

        box.innerHTML += `
            <div class="preview-card">
                <img src="${url}">
                <p>${file.name}</p>
                <small>${size} KB</small>
                <button class="remove-preview-btn" onclick="removePreview(${index})">✕</button>
            </div>
        `;
    });
}

function removePreview(index){
    selectedFiles.splice(index, 1);
    showPreview();
}

// اختيار API
let autoIndex = 0;

function getAPI(){
    if(apis.length === 0){
        alert("❌ أضف API أولاً");
        return null;
    }

    let mode = document.querySelector('input[name="mode"]:checked').value;
    let api;

    if(mode === "auto"){
        api = apis[autoIndex];
        autoIndex++;
        if(autoIndex >= apis.length) autoIndex = 0;
    } else {
        let selectIndex = document.getElementById("apiSelect").value;
        api = apis[selectIndex];
    }

    return api;
}

// رفع الصور
async function uploadImages(){
    if(selectedFiles.length === 0){
        alert("❌ اختر صور أولاً");
        return;
    }

    if(apis.length === 0){
        alert("❌ أضف API حساب أولاً");
        return;
    }

    uploadedLinks = [];
    let result = document.getElementById("results");
    result.innerHTML = "<p style='text-align:center; color:#0ea;'>⏳ جاري الرفع...</p>";

    let successCount = 0;
    let failCount = 0;

    for(let file of selectedFiles){
        let api = getAPI();

        if(!api) return;

        try {
            let base64 = await convertBase64(file);

            let form = new FormData();
            form.append("key", api.key);
            form.append("image", base64.split(",")[1]);

            let response = await fetch(
                "https://api.imgbb.com/1/upload",
                {
                    method: "POST",
                    body: form,
                    timeout: 30000
                }
            );

            let data = await response.json();

            if(data.success){
                let link = data.data.url;
                uploadedLinks.push(link);
                api.uploads++;
                successCount++;
                saveAPIs();

                result.innerHTML += `
                    <div class="result-card success">
                        <b>✅ ${file.name}</b>
                        <input value="${link}" readonly>
                        <button class="copy-btn"
                        onclick="copyText('${link}')">                        📋 نسخ
                        </button>
                    </div>
                `;

            } else {
                failCount++;
                let errorMsg = data.error?.message || "خطأ غير معروف";
                result.innerHTML += `
                    <div class="result-card error">
                    ❌ فشل رفع ${file.name}<br>
                    <small>${errorMsg}</small>
                    </div>
                `;
            }

        } catch(error){
            failCount++;
            result.innerHTML += `
                <div class="result-card error">
                ❌ خطأ في ${file.name}<br>
                <small>${error.message}</small>
                </div>
            `;
        }
    }

    result.innerHTML += `
        <div class="upload-summary">
        ✅ نجح: ${successCount} | ❌ فشل: ${failCount}
        </div>
    `;

    updateStats();
}

// تحويل الصورة Base64
function convertBase64(file){
    return new Promise((resolve, reject) => {
        if(file.size > 32 * 1024 * 1024){
            reject(new Error("حجم الملف كبير جداً (أقل من 32 MB)"));
            return;
        }

        let reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result);
        };

        reader.onerror = () => {
            reject(new Error("خطأ في قراءة الملف"));
        };

        reader.readAsDataURL(file);
    });
}

// نسخ رابط واحد
function copyText(text){
    navigator.clipboard.writeText(text)
        .then(() => showMessage("✅ تم النسخ"))
        .catch(() => showMessage("❌ فشل النسخ"));
}

// نسخ كل الروابط
function copyAll(){
    if(uploadedLinks.length === 0){
        alert("❌ لا توجد روابط للنسخ");
        return;
    }

    navigator.clipboard.writeText(uploadedLinks.join("\n"))
        .then(() => showMessage("✅ تم نسخ جميع الروابط"))
        .catch(() => showMessage("❌ فشل النسخ"));
}

// رسالة صغيرة
function showMessage(text){
    let msg = document.createElement("div");
    msg.innerHTML = text;
    msg.style.position = "fixed";
    msg.style.bottom = "30px";
    msg.style.right = "30px";
    msg.style.padding = "15px 25px";
    msg.style.background = "rgba(0,0,0,.9)";
    msg.style.borderRadius = "15px";
    msg.style.zIndex = "999";
    msg.style.border = "1px solid rgba(0,255,200,.3)";

    document.body.appendChild(msg);

    setTimeout(() => {
        msg.remove();
    }, 2500);
}

function updateStats(){
    document.getElementById("apiCount").innerText = apis.length;

    let count = 0;
    apis.forEach(a => {
        count += a.uploads;
    });

    document.getElementById("imageCount").innerText = count;
}