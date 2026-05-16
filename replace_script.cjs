const fs = require('fs');
let c = fs.readFileSync('src/components/layout/Topbar.jsx', 'utf8');

c = c.replace(
  "className={`notification-item ${notif.isRead || notif.id.toString().includes('stock') ? 'read' : ''} ${notif.isCritical ? 'critical' : ''}`}",
  "className={`notification-item ${notif.isRead || notif.id.toString().includes('stock') || notif.id.toString().includes('bday') ? 'read' : ''} ${notif.isCritical ? 'critical' : ''}`}"
);

c = c.replace(
  "{notif.type === 'goal_achieved' ? <Trophy size={16} /> : \n                          notif.type === 'out-of-stock' ? <PackageX size={16} /> : \n                          notif.type === 'low-stock' ? <AlertTriangle size={16} /> : \n                          notif.type === 'sale_success' ? <Check size={16} /> :\n                          <Info size={16} />}",
  "{notif.type === 'goal_achieved' ? <Trophy size={16} /> : \n                           notif.type === 'note_completed' ? <Check size={16} /> : \n                           notif.type === 'birthday' ? <Cake size={16} /> : \n                           notif.type === 'out-of-stock' ? <PackageX size={16} /> : \n                           notif.type === 'low-stock' ? <AlertTriangle size={16} /> : \n                           notif.type === 'sale_success' ? <Check size={16} /> :\n                           <Info size={16} />}"
);

c = c.replace(
  "{!notif.isRead && !notif.id.toString().includes('stock') && <span className=\"unread-dot\"></span>}",
  "{!notif.isRead && !notif.id.toString().includes('stock') && !notif.id.toString().includes('bday') && <span className=\"unread-dot\"></span>}"
);

c = c.replace(
  "{notif.id.toString().includes('stock') ? (\n                            <button className=\"btn-notif-del\" onClick={(e) => handleDismissStockAlert(notif.id, e)} title=\"Marcar como leída\"><Check size={14} /></button>\n                          ) : (\n                            <button className=\"btn-notif-del\" onClick={(e) => deleteNotification(notif.id, e)} title=\"Eliminar\"><Trash2 size={14} /></button>\n                          )}",
  "{notif.id.toString().includes('stock') ? (\n                            <button className=\"btn-notif-del\" onClick={(e) => handleDismissStockAlert(notif.id, e)} title=\"Marcar como leída\"><Check size={14} /></button>\n                          ) : notif.id.toString().includes('bday') ? (\n                            <button className=\"btn-notif-del\" onClick={(e) => handleDismissBdayAlert(notif.id, e)} title=\"Marcar como leída\"><Check size={14} /></button>\n                          ) : (\n                            <button className=\"btn-notif-del\" onClick={(e) => deleteNotification(notif.id, e)} title=\"Eliminar\"><Trash2 size={14} /></button>\n                          )}"
);

fs.writeFileSync('src/components/layout/Topbar.jsx', c);
console.log('File updated successfully.');
