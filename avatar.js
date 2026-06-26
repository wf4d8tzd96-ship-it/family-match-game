(() => {
const AVATARS = [
  {
    id: "dad",
    name: "爸爸",
    bg: "#ddecfb",
  },
  {
    id: "mom",
    name: "妈妈",
    bg: "#ffe0e9",
  },
  {
    id: "brother",
    name: "RMB1",
    bg: "#dff3e6",
  },
  {
    id: "sister",
    name: "RMB2",
    bg: "#ffdfe5",
  },
  {
    id: "grandpaM",
    name: "外公",
    bg: "#dcecff",
  },
  {
    id: "grandmaM",
    name: "外婆",
    bg: "#f1ddf7",
  },
  {
    id: "grandpaP",
    name: "爷爷",
    bg: "#dff2e7",
  },
  {
    id: "grandmaP",
    name: "奶奶",
    bg: "#eadff8",
  },
];

function randomAvatarId() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
}

function avatarById(id) {
  return AVATARS.find((avatar) => avatar.id === id);
}

function avatarMarkup(id) {
  const avatar = avatarById(id);
  if (!avatar) return "";
  return `<img class="avatar-img" src="assets/${avatar.id}.png" alt="${avatar.name}" draggable="false" />`;
}

window.FamilyAvatars = {
  AVATARS,
  randomAvatarId,
  avatarById,
  avatarMarkup,
};
})();
