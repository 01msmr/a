document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('container');
  const sectionJumper = document.getElementById('section-jumper');
  const sectionNavList = document.getElementById('section-nav-list');
  const titleElement = document.querySelector('.title');
  let linkData = [];
  let editMode = false;

  // ### GITHUB GIST INTEGRATION ###
  let gistConfig = JSON.parse(localStorage.getItem('gistConfig')) || {};

  const configureGist = async () => {
    const gistId = prompt('Enter your GitHub Gist ID:', gistConfig.gistId || '');
    if (!gistId) return;
    const pat = prompt('Enter your GitHub Personal Access Token with "gist" scope:', gistConfig.pat || '');
    if (!pat) return;

    gistConfig = { gistId, pat };
    localStorage.setItem('gistConfig', JSON.stringify(gistConfig));
    alert('Gist settings saved! Data will now sync.');
    await loadData();
  };

  const loadFromGist = async () => {
    if (!gistConfig.gistId || !gistConfig.pat) return null;
    try {
      const response = await fetch(`https://api.github.com/gists/${gistConfig.gistId}`);
      if (!response.ok) throw new Error(`Gist fetch failed: ${response.statusText}`);
      const gist = await response.json();
      const file = Object.values(gist.files)[0];

      if (file && file.content) {
        return JSON.parse(file.content);
      } else {
        console.log("Gist file is empty. Will fall back to other data sources.");
        return null;
      }
    } catch (error) {
      console.error('Could not load from Gist:', error);
      return null;
    }
  };

  const saveToGist = async () => {
    if (!gistConfig.gistId || !gistConfig.pat) return;
    try {
      const response = await fetch(`https://api.github.com/gists/${gistConfig.gistId}`);
      if (!response.ok) throw new Error('Could not get Gist filename.');
      const gist = await response.json();
      const fileName = Object.keys(gist.files)[0];

      await fetch(`https://api.github.com/gists/${gistConfig.gistId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `token ${gistConfig.pat}`, 'Accept': 'application/vnd.github.v3+json', },
        body: JSON.stringify({ files: { [fileName]: { content: JSON.stringify(linkData, null, 2), }, }, }),
      });
    } catch (error) {
      console.error('Could not save to Gist:', error);
    }
  };

  // ### DATA & RENDER LOGIC ###
  const loadData = async () => {
    let data = await loadFromGist();
    if (!data) {
      const savedData = localStorage.getItem('linkData');
      data = savedData ? JSON.parse(savedData) : null;
    }
    if (!data) {
      try {
        const response = await fetch('links.json');
        data = await response.json();
      } catch (error) {
        console.log("Could not load links.json, falling back to empty data");
        data = [];
      }
    }
    linkData = data;
    renderContent();
  };

  const saveData = () => {
    localStorage.setItem('linkData', JSON.stringify(linkData));
    saveToGist();
    console.log("Data saved.");
  };

  const renderContent = () => {
    container.innerHTML = '';
    sectionJumper.innerHTML = '';
    sectionNavList.innerHTML = '';
    document.querySelector('.add-section-btn')?.remove();
    document.querySelector('.gear-btn')?.remove();

    // Gear button for Edit Mode
    const gearBtn = document.createElement('button');
    gearBtn.className = 'gear-btn';
    gearBtn.textContent = '⚙️';
    gearBtn.title = 'Toggle edit mode';
    titleElement.insertBefore(gearBtn, sectionJumper);

    if (editMode) {
      const addSectionBtn = document.createElement('button');
      addSectionBtn.className = 'add-section-btn';
      addSectionBtn.textContent = '+';
      addSectionBtn.title = 'Add new section';
      titleElement.appendChild(addSectionBtn);
    }

    linkData.forEach((section, sectionIndex) => {
      const sectionEl = document.createElement('section');
      sectionEl.id = section.id;
      sectionEl.dataset.index = sectionIndex;

      const titleEl = document.createElement('h3');
      titleEl.className = 'name';
      titleEl.style.color = section.color;

      const linkEl = document.createElement('a');
      linkEl.href = `#${section.id}`;
      linkEl.target = '_self';
      linkEl.textContent = section.title;
      linkEl.dataset.sectionIndex = sectionIndex;

      if (editMode) {
        sectionEl.draggable = true;
        linkEl.contentEditable = true;
        const deleteSectionBtn = document.createElement('button');
        deleteSectionBtn.className = 'delete-section-btn';
        deleteSectionBtn.dataset.index = sectionIndex;
        deleteSectionBtn.textContent = 'x';
        deleteSectionBtn.title = 'Delete this section';
        titleEl.appendChild(deleteSectionBtn);
      }
      titleEl.insertBefore(linkEl, titleEl.firstChild);
      sectionEl.appendChild(titleEl);

      const groupEl = document.createElement('ul');
      groupEl.className = 'group';
      (section.links || []).forEach((link, linkIndex) => {
        const listItem = document.createElement('li');
        if (editMode) {
          listItem.draggable = true;
          listItem.dataset.sectionIndex = sectionIndex;
          listItem.dataset.linkIndex = linkIndex;
        }
        const itemContainer = document.createElement('div');
        const linkElement = document.createElement('a');
        linkElement.href = link.url;
        linkElement.textContent = link.name;
        linkElement.tabIndex = 0;

        // In edit mode: prevent navigation and enable editing
        if (editMode) {
          linkElement.addEventListener('click', (e) => {
            e.preventDefault();
            editLink(sectionIndex, linkIndex);
          });
        }

        itemContainer.appendChild(linkElement);

        if (editMode) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-link-btn';
          deleteBtn.dataset.section = sectionIndex;
          deleteBtn.dataset.link = linkIndex;
          deleteBtn.textContent = 'x';
          itemContainer.appendChild(deleteBtn);
        }
        listItem.appendChild(itemContainer);
        groupEl.appendChild(listItem);
      });

      if (editMode) {
        const addLinkLi = document.createElement('li');
        addLinkLi.classList.add('add-link-item');
        const addLinkBtn = document.createElement('button');
        addLinkBtn.className = 'add-new-link-button';
        addLinkBtn.dataset.section = sectionIndex;
        addLinkBtn.title = 'Add a new link';
        addLinkBtn.textContent = '+';
        addLinkLi.appendChild(addLinkBtn);
        groupEl.appendChild(addLinkLi);
      }

      sectionEl.appendChild(groupEl);
      container.appendChild(sectionEl);

      const navLink = document.createElement('a');
      navLink.className = 'secname';
      navLink.href = `#${section.id}`;
      navLink.target = '_self';
      navLink.textContent = section.title;
      navLink.addEventListener('click', () => {
        setTimeout(() => {
          sectionJumper.value = `#${section.id}`;
          // Update active class
          document.querySelectorAll('.secname.active').forEach(el => el.classList.remove('active'));
          navLink.classList.add('active');
        }, 100);
      });
      sectionNavList.appendChild(navLink);

      const option = document.createElement('option');
      option.value = `#${section.id}`;
      option.textContent = section.title;
      sectionJumper.appendChild(option);
    });

    // Edit Mode Option in Dropdown
    const editOption = document.createElement('option');
    editOption.value = 'edit-mode';
    editOption.textContent = editMode ? ' - end it - ' : ' - edit - ';
    sectionJumper.appendChild(editOption);

    if (editMode) {
      attachSectionDragDropListeners();
      attachLinkDragDropListeners();
    }
    checkNavOverflow();
  };

  // Function to edit links
  const editLink = (sectionIndex, linkIndex) => {
    const currentLink = linkData[sectionIndex].links[linkIndex];
    const newName = prompt('Link Name:', currentLink.name);
    if (newName === null) return;

    const newUrl = prompt('Link URL:', currentLink.url);
    if (newUrl === null) return;

    linkData[sectionIndex].links[linkIndex] = {
      name: newName,
      url: newUrl
    };

    saveData();
    renderContent();
  };

  const checkNavOverflow = () => {
    sectionNavList.style.display = 'inline-block';
    const navFits = titleElement.scrollWidth <= titleElement.clientWidth;
    sectionNavList.classList.toggle('nav-hidden', !navFits);
  };
  window.addEventListener('resize', checkNavOverflow);

  const toggleEditMode = () => {
    // Autosave when ending edit mode
    if (editMode) {
      saveData();
    }
    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);
    renderContent();
  };

  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('gear-btn')) {
      toggleEditMode();
    }
    if (e.target.classList.contains('add-section-btn')) {
      const name = prompt('Enter new section name:');
      if (name) {
        linkData.push({ id: `sec${Date.now()}`, title: name, color: 'cyan', links: [] });
        saveData();
        renderContent();
      }
    }
    if (e.target.classList.contains('delete-section-btn')) {
      if (confirm('Are you sure you want to delete this entire section?')) {
        linkData.splice(e.target.dataset.index, 1);
        saveData();
        renderContent();
      }
    }
    if (e.target.classList.contains('add-new-link-button')) {
      const sectionIndex = e.target.dataset.section;
      const name = prompt('Enter link name:');
      if (!name) return;
      const url = prompt('Enter link URL:', 'https://');
      if (name && url) {
        if (!linkData[sectionIndex].links) linkData[sectionIndex].links = [];
        linkData[sectionIndex].links.push({ name, url });
        saveData();
        renderContent();
      }
    }
    if (e.target.classList.contains('delete-link-btn')) {
      if (confirm('Are you sure you want to delete this link?')) {
        linkData[e.target.dataset.section].links.splice(e.target.dataset.link, 1);
        saveData();
        renderContent();
      }
    }
  });

  // ### EVENT LISTENERS FOR EDITABLE TITLE ###
  container.addEventListener('blur', (e) => {
    if (e.target.isContentEditable && e.target.parentElement.classList.contains('name')) {
      const sectionIndex = e.target.dataset.sectionIndex;
      linkData[sectionIndex].title = e.target.textContent;
      saveData();
      document.querySelector(`.secname[href="#${linkData[sectionIndex].id}"]`).textContent = e.target.textContent;
      document.querySelector(`#section-jumper option[value="#${linkData[sectionIndex].id}"]`).textContent = e.target.textContent;
    }
  }, true);

  container.addEventListener('keydown', (e) => {
    if (e.target.isContentEditable && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  });

  sectionJumper.addEventListener('change', (e) => {
    if (e.target.value === 'edit-mode') {
      toggleEditMode();
      setTimeout(() => {
        e.target.selectedIndex = 0;
      }, 100);
    } else if (e.target.value) {
      window.location.hash = e.target.value;
      // Update active class for nav links
      document.querySelectorAll('.secname.active').forEach(el => el.classList.remove('active'));
      const activeNavLink = document.querySelector(`.secname[href="${e.target.value}"]`);
      if (activeNavLink) {
        activeNavLink.classList.add('active');
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    const isModifier = e.metaKey || e.ctrlKey;
    if (isModifier && e.key === 'e') {
      e.preventDefault();
      toggleEditMode();
    }
    if (isModifier && e.key === 's') {
      e.preventDefault();
      configureGist();
    }
  });

  const removeDropIndicators = () => {
    document.querySelectorAll('.drop-target-above, .drop-target-below').forEach(el =>
      el.classList.remove('drop-target-above', 'drop-target-below')
    );
  };

  // SECTION DRAG & DROP - only between Sections
  let dragSrcSectionEl = null;
  const handleSectionDragStart = function (e) {
    dragSrcSectionEl = this;
    this.classList.add('dragging');
  };
  const handleSectionDragOver = function (e) {
    e.preventDefault();
    if (this === dragSrcSectionEl || this.tagName !== 'SECTION') return;
    removeDropIndicators();
    const rect = this.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (e.clientY < midpoint) {
      this.classList.add('drop-target-above');
    } else {
      this.classList.add('drop-target-below');
    }
  };
  const handleSectionDrop = function (e) {
    e.stopPropagation();
    if (dragSrcSectionEl && dragSrcSectionEl !== this && this.tagName === 'SECTION') {
      const srcIndex = parseInt(dragSrcSectionEl.dataset.index, 10);
      const rect = this.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      let destIndex = parseInt(this.dataset.index, 10);
      if (e.clientY > midpoint) destIndex++;
      if (srcIndex < destIndex) destIndex--;
      const [removed] = linkData.splice(srcIndex, 1);
      linkData.splice(destIndex, 0, removed);
      saveData();
      renderContent();
    }
    removeDropIndicators();
    return false;
  };
  const handleSectionDragEnd = function () {
    this.classList.remove('dragging');
    removeDropIndicators();
  };
  const attachSectionDragDropListeners = () => {
    container.querySelectorAll('section[draggable="true"]').forEach(section => {
      section.addEventListener('dragstart', handleSectionDragStart);
      section.addEventListener('dragover', handleSectionDragOver);
      section.addEventListener('dragleave', removeDropIndicators);
      section.addEventListener('drop', handleSectionDrop);
      section.addEventListener('dragend', handleSectionDragEnd);
    });
  };

  // LINK DRAG & DROP - only between Links within the same Section
  let dragSrcLinkEl = null;
  const handleLinkDragStart = function (e) {
    e.stopPropagation();
    dragSrcLinkEl = this;
    this.classList.add('dragging');
  };
  const handleLinkDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (this === dragSrcLinkEl || !this.dataset.linkIndex || this.tagName !== 'LI') return;
    removeDropIndicators();

    const allLinks = Array.from(this.parentElement.querySelectorAll('li[data-link-index]'));
    const isLastLink = allLinks.indexOf(this) === allLinks.length - 1;

    if (isLastLink) {
      const rect = this.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (e.clientY < midpoint) {
        this.classList.add('drop-target-above');
      } else {
        this.classList.add('drop-target-below');
      }
    } else {
      this.classList.add('drop-target-above');
    }
  };
  const handleLinkDrop = function (e) {
    e.stopPropagation();
    if (dragSrcLinkEl && dragSrcLinkEl !== this && this.dataset.linkIndex && this.tagName === 'LI') {
      const srcSectionIndex = parseInt(dragSrcLinkEl.dataset.sectionIndex, 10);
      const destSectionIndex = parseInt(this.dataset.sectionIndex, 10);
      if (srcSectionIndex === destSectionIndex) {
        const srcLinkIndex = parseInt(dragSrcLinkEl.dataset.linkIndex, 10);
        let destLinkIndex = parseInt(this.dataset.linkIndex, 10);
        const linksArray = linkData[srcSectionIndex].links;

        const allLinks = Array.from(this.parentElement.querySelectorAll('li[data-link-index]'));
        const isLastLink = allLinks.indexOf(this) === allLinks.length - 1;

        if (isLastLink) {
          const rect = this.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          if (e.clientY > midpoint) destLinkIndex++;
        }

        if (srcLinkIndex < destLinkIndex) destLinkIndex--;
        const [removed] = linksArray.splice(srcLinkIndex, 1);
        linksArray.splice(destLinkIndex, 0, removed);
        saveData();
        renderContent();
      }
    }
    removeDropIndicators();
    return false;
  };
  const handleLinkDragEnd = function (e) {
    e.stopPropagation();
    this.classList.remove('dragging');
    removeDropIndicators();
  };
  const attachLinkDragDropListeners = () => {
    container.querySelectorAll('li[draggable="true"]').forEach(li => {
      li.addEventListener('dragstart', handleLinkDragStart);
      li.addEventListener('dragover', handleLinkDragOver);
      li.addEventListener('dragleave', removeDropIndicators);
      li.addEventListener('drop', handleLinkDrop);
      li.addEventListener('dragend', handleLinkDragEnd);
    });
  };

  loadData();
});