'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../lib/i18nClient';

/**
 * TeamWorkspace - Multi-user collaboration for enterprise reports
 * Features:
 * - Team member management
 * - Role-based permissions
 * - Shared report access
 * - Activity feed
 * - Comments & annotations
 * Supports 207 languages via dynamic translation
 */

const BASE_UI = {
  teamWorkspace: 'Team Workspace',
  members: 'Members',
  activity: 'Activity',
  settings: 'Settings',
  inviteMember: 'Invite Member',
  email: 'Email',
  role: 'Role',
  invite: 'Invite',
  cancel: 'Cancel',
  remove: 'Remove',
  pendingInvites: 'Pending Invites',
  sharedReports: 'Shared Reports',
  workspaceSettings: 'Workspace Settings',
  workspaceName: 'Workspace Name',
  save: 'Save',
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  commenter: 'Commenter',
  viewer: 'Viewer',
  ownerDesc: 'Full access, can manage team',
  adminDesc: 'Can edit and share reports',
  editorDesc: 'Can create and edit reports',
  commenterDesc: 'Can view and comment',
  viewerDesc: 'View-only access',
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
  lastActive: 'Last active',
  justNow: 'Just now',
  noActivity: 'No activity yet',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Pashto', 'Sindhi'];

export default function TeamWorkspace({ verticalId, color = '#3b82f6', lang = 'English', organizationName = '' }) {
  const [ui, setUi] = useState(BASE_UI);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([
    { id: 1, name: 'You', email: 'you@company.com', role: 'Owner', avatar: '👤', status: 'online', lastActive: 'Now' },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');
  const [activities, setActivities] = useState([
    { id: 1, user: 'You', action: 'created the workspace', time: 'Just now', icon: '🏢' },
  ]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [sharedReports, setSharedReports] = useState([]);

  const isRTL = RTL_LANGUAGES.includes(lang);

  // Load translations
  useEffect(() => {
    (async () => {
      try {
        const { t } = await getUiTranslations({
          base: BASE_UI,
          lang,
          cachePrefix: 'SI_TeamWorkspace',
          setDir: false,
        });
        setUi(t || BASE_UI);
      } catch (err) {
        console.warn('TeamWorkspace translation failed:', err);
      }
    })();
  }, [lang]);

  const roles = [
    { id: 'Owner', label: ui.owner, description: ui.ownerDesc, icon: '👑' },
    { id: 'Admin', label: ui.admin, description: ui.adminDesc, icon: '⚙️' },
    { id: 'Editor', label: ui.editor, description: ui.editorDesc, icon: '✏️' },
    { id: 'Commenter', label: ui.commenter, description: ui.commenterDesc, icon: '💬' },
    { id: 'Viewer', label: ui.viewer, description: ui.viewerDesc, icon: '👁️' },
  ];

  const handleInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
    
    const newInvite = {
      id: Date.now(),
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
      sentAt: new Date().toISOString(),
    };
    
    setPendingInvites([...pendingInvites, newInvite]);
    setActivities([
      { id: Date.now(), user: 'You', action: `invited ${inviteEmail} as ${inviteRole}`, time: 'Just now', icon: '📧' },
      ...activities,
    ]);
    setInviteEmail('');
  };

  const handleRemoveMember = (memberId) => {
    const member = members.find(m => m.id === memberId);
    if (member && member.role !== 'Owner') {
      setMembers(members.filter(m => m.id !== memberId));
      setActivities([
        { id: Date.now(), user: 'You', action: `removed ${member.name} from the team`, time: 'Just now', icon: '🚪' },
        ...activities,
      ]);
    }
  };

  const handleCancelInvite = (inviteId) => {
    setPendingInvites(pendingInvites.filter(i => i.id !== inviteId));
  };

  const handleChangeRole = (memberId, newRole) => {
    setMembers(members.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    const member = members.find(m => m.id === memberId);
    if (member) {
      setActivities([
        { id: Date.now(), user: 'You', action: `changed ${member.name}'s role to ${newRole}`, time: 'Just now', icon: '🔄' },
        ...activities,
      ]);
    }
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 20,
  };

  const contentStyle = {
    background: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 800,
    maxHeight: '90vh',
    overflow: 'hidden',
    border: `1px solid ${color}33`,
    boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${color}22`,
    direction: isRTL ? 'rtl' : 'ltr',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '12px 20px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${color}44`,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          transition: 'all 0.2s',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = `${color}22`;
          e.currentTarget.style.borderColor = color;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = `${color}44`;
        }}
      >
        <span style={{ fontSize: 18 }}>👥</span>
        {ui.teamWorkspace}
        <span style={{
          background: `${color}33`,
          padding: '2px 8px',
          borderRadius: 10,
          fontSize: 12,
        }}>
          {members.length}
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div style={modalStyle} onClick={() => setIsOpen(false)}>
          <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h2 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>
                  👥 Team Workspace
                </h2>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                  {organizationName || 'Your Organization'} • {members.length} member{members.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              padding: '0 24px',
            }}>
              {[
                { id: 'members', label: 'Team Members', icon: '👤' },
                { id: 'invite', label: 'Invite', icon: '📧' },
                { id: 'activity', label: 'Activity', icon: '📋' },
                { id: 'settings', label: 'Settings', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? `2px solid ${color}` : '2px solid transparent',
                    color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    marginBottom: -1,
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ padding: 24, maxHeight: 'calc(90vh - 180px)', overflowY: 'auto' }}>
              {/* Members Tab */}
              {activeTab === 'members' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {members.map((member) => (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: `${color}33`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          position: 'relative',
                        }}>
                          {member.avatar}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: member.status === 'online' ? '#10b981' : '#6b7280',
                            border: '2px solid #0a1628',
                          }} />
                        </div>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600 }}>{member.name}</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{member.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value)}
                          disabled={member.role === 'Owner'}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            cursor: member.role === 'Owner' ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                          }}
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id} style={{ background: '#1a2d4a' }}>
                              {role.icon} {role.label}
                            </option>
                          ))}
                        </select>
                        {member.role !== 'Owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              background: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pending Invites */}
                  {pendingInvites.length > 0 && (
                    <>
                      <h4 style={{ color: 'rgba(255,255,255,0.7)', margin: '16px 0 8px', fontSize: 14 }}>
                        Pending Invitations
                      </h4>
                      {pendingInvites.map((invite) => (
                        <div
                          key={invite.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 16,
                            background: 'rgba(245,158,11,0.05)',
                            borderRadius: 12,
                            border: '1px solid rgba(245,158,11,0.2)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              background: 'rgba(245,158,11,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                            }}>
                              📧
                            </div>
                            <div>
                              <div style={{ color: '#fff', fontWeight: 600 }}>{invite.email}</div>
                              <div style={{ color: '#f59e0b', fontSize: 13 }}>Invitation pending • {invite.role}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelInvite(invite.id)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.7)',
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Invite Tab */}
              {activeTab === 'invite' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{
                    padding: 20,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <h4 style={{ color: '#fff', margin: '0 0 16px', fontSize: 16 }}>
                      Invite Team Members
                    </h4>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        style={{
                          flex: 1,
                          minWidth: 200,
                          padding: '12px 16px',
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: 14,
                        }}
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: 14,
                        }}
                      >
                        {roles.filter(r => r.id !== 'Owner').map((role) => (
                          <option key={role.id} value={role.id} style={{ background: '#1a2d4a' }}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleInvite}
                        disabled={!inviteEmail.trim() || !inviteEmail.includes('@')}
                        style={{
                          padding: '12px 24px',
                          borderRadius: 8,
                          background: inviteEmail.includes('@') ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'rgba(255,255,255,0.1)',
                          border: 'none',
                          color: '#fff',
                          cursor: inviteEmail.includes('@') ? 'pointer' : 'not-allowed',
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        Send Invite
                      </button>
                    </div>
                  </div>

                  {/* Role Descriptions */}
                  <div style={{
                    padding: 20,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <h4 style={{ color: '#fff', margin: '0 0 16px', fontSize: 16 }}>
                      Role Permissions
                    </h4>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {roles.map((role) => (
                        <div
                          key={role.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            background: inviteRole === role.id ? `${color}11` : 'transparent',
                            borderRadius: 8,
                            border: inviteRole === role.id ? `1px solid ${color}33` : '1px solid transparent',
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{role.icon}</span>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{role.label}</div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{role.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {activities.map((activity, index) => (
                    <div
                      key={activity.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: index < activities.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}
                    >
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        flexShrink: 0,
                      }}>
                        {activity.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontSize: 14 }}>
                          <strong>{activity.user}</strong>{' '}
                          <span style={{ color: 'rgba(255,255,255,0.7)' }}>{activity.action}</span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{
                    padding: 20,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <h4 style={{ color: '#fff', margin: '0 0 16px', fontSize: 16 }}>
                      Workspace Settings
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 500 }}>Allow comments on reports</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Team members can add comments</div>
                        </div>
                        <div style={{
                          width: 48,
                          height: 26,
                          borderRadius: 13,
                          background: `${color}`,
                          padding: 2,
                          cursor: 'pointer',
                        }}>
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#fff',
                            marginLeft: 'auto',
                          }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 500 }}>Activity notifications</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Get notified of team activity</div>
                        </div>
                        <div style={{
                          width: 48,
                          height: 26,
                          borderRadius: 13,
                          background: `${color}`,
                          padding: 2,
                          cursor: 'pointer',
                        }}>
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#fff',
                            marginLeft: 'auto',
                          }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 500 }}>Require approval for sharing</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Admins must approve external shares</div>
                        </div>
                        <div style={{
                          width: 48,
                          height: 26,
                          borderRadius: 13,
                          background: 'rgba(255,255,255,0.2)',
                          padding: 2,
                          cursor: 'pointer',
                        }}>
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#fff',
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: 20,
                    background: 'rgba(239,68,68,0.05)',
                    borderRadius: 12,
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <h4 style={{ color: '#ef4444', margin: '0 0 12px', fontSize: 16 }}>
                      Danger Zone
                    </h4>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 16px' }}>
                      These actions are irreversible. Please proceed with caution.
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        style={{
                          padding: '10px 16px',
                          borderRadius: 8,
                          background: 'transparent',
                          border: '1px solid rgba(239,68,68,0.4)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        Transfer Ownership
                      </button>
                      <button
                        style={{
                          padding: '10px 16px',
                          borderRadius: 8,
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.4)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        Delete Workspace
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
