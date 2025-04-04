document.addEventListener("DOMContentLoaded", () => {
  loadSavedLists();
});

let currentSearchCodes = [];

// Handle Search Form Submission
document
  .getElementById("searchForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    const responseCode = document.getElementById("responseCode").value.trim();
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";
    currentSearchCodes = [];

    let codes = [];
    if (/^\d{3}$/.test(responseCode)) {
      codes.push(responseCode);
    } else if (/^\dxx$/.test(responseCode)) {
      let startDigit = responseCode[0];
      for (let i = 0; i <= 9; i++) {
        for (let j = 0; j <= 9; j++) {
          codes.push(`${startDigit}${i}${j}`);
        }
      }
    } else if (/^\d{2}x$/.test(responseCode)) {
      let startDigits = responseCode.slice(0, 2);
      for (let i = 0; i <= 9; i++) {
        codes.push(`${startDigits}${i}`);
      }
    } else {
      resultsDiv.innerHTML =
        "<p>Invalid format. Use '200', '2xx', '20x', etc.</p>";
      return;
    }

    currentSearchCodes = codes;

    codes.forEach((code) => {
      let img = new Image();
      img.src = `https://http.dog/${code}.jpg`;
      img.alt = `Dog Image for ${code}`;
      img.onload = function () {
        let container = document.createElement("div");
        container.className = "image-container";
        container.innerHTML = `
                <img src="${img.src}" alt="${img.alt}">
                <p>${code}</p>
            `;
        resultsDiv.appendChild(container);
      };
    });

    resultsDiv.innerHTML += `<button onclick="saveList()">Save This List</button>`;
  });

// Save List to Server
function saveList() {
  if (currentSearchCodes.length === 0) {
    alert("No search results to save.");
    return;
  }

  let listName = prompt("Enter a name for this list:");
  if (!listName) return;

  fetch("/api/saveList", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: listName, codes: currentSearchCodes }),
  })
    .then((response) => response.json())
    .then((data) => {
      alert("List saved successfully!");
      loadSavedLists();
    })
    .catch((error) => console.error("Error saving list:", error));
}

// Load Saved Lists
function loadSavedLists() {
  const savedDiv = document.getElementById("savedResults");
  if (!savedDiv) return; // Only load on the lists page

  fetch("/api/savedLists")
    .then((response) => response.json())
    .then((savedLists) => {
      savedDiv.innerHTML = "";
      if (savedLists.length === 0) {
        savedDiv.innerHTML = "<p>No saved searches.</p>";
        return;
      }

      savedLists.forEach((list, index) => {
        let container = document.createElement("div");
        container.className = "saved-container";
        container.innerHTML = `
                    <h3>${list.name} (Saved on: ${list.createdAt})</h3>
                    <button onclick="viewList(${index})">View List</button>
                    <button onclick="deleteList(${index})">Delete</button>
                `;
        savedDiv.appendChild(container);
      });
    })
    .catch((error) => console.error("Error loading lists:", error));
}

// View List Items
function viewList(index) {
  fetch("/api/savedLists")
    .then((response) => response.json())
    .then((savedLists) => {
      let list = savedLists[index];
      let savedDiv = document.getElementById("savedResults");

      savedDiv.innerHTML = `<h3>${list.name} (Saved on: ${list.createdAt})</h3>`;

      list.codes.forEach((code) => {
        let img = new Image();
        img.src = `https://http.dog/${code}.jpg`;
        img.alt = `Dog Image for ${code}`;
        img.onload = function () {
          let container = document.createElement("div");
          container.className = "image-container";
          container.innerHTML = `
                        <img src="${img.src}" alt="${img.alt}">
                        <p>${code}</p>
                    `;
          savedDiv.appendChild(container);
        };
      });

      savedDiv.innerHTML += `<button onclick="loadSavedLists()">Back</button>`;
    })
    .catch((error) => console.error("Error viewing list:", error));
}

// Delete List
function deleteList(index) {
  fetch(`/api/deleteList/${index}`, { method: "DELETE" })
    .then((response) => response.json())
    .then((data) => {
      alert("List deleted successfully!");
      loadSavedLists();
    })
    .catch((error) => console.error("Error deleting list:", error));
}
