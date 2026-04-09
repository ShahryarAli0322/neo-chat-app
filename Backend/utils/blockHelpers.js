const User = require("../Models/userModel");

async function getBlockRelation(viewerId, otherId) {
  const vid = String(viewerId);
  const oid = String(otherId);
  const [viewer, other] = await Promise.all([
    User.findById(viewerId).select("blockedUsers").lean(),
    User.findById(otherId).select("blockedUsers").lean(),
  ]);
  if (!viewer || !other) {
    return { haveIBlockedOther: false, amIBlockedByOther: false };
  }
  return {
    haveIBlockedOther: (viewer.blockedUsers || []).some((id) => String(id) === oid),
    amIBlockedByOther: (other.blockedUsers || []).some((id) => String(id) === vid),
  };
}

function isEitherBlocked(rel) {
  return !!(rel && (rel.haveIBlockedOther || rel.amIBlockedByOther));
}

async function attachBlockFlagsToChatDoc(chat, viewerId) {
  if (!chat || chat.isGroupChat) {
    return chat?.toObject ? chat.toObject() : chat;
  }
  const plain = chat.toObject ? chat.toObject() : { ...chat };
  const otherId = (plain.users || []).find((u) => String(u._id) !== String(viewerId))?._id;
  if (!otherId) return plain;
  const rel = await getBlockRelation(viewerId, otherId);
  plain.haveIBlockedOther = rel.haveIBlockedOther;
  plain.amIBlockedByOther = rel.amIBlockedByOther;
  return plain;
}

module.exports = {
  getBlockRelation,
  isEitherBlocked,
  attachBlockFlagsToChatDoc,
};
