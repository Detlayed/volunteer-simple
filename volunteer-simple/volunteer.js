// Simple client-side volunteer auth (prototype)
function getUsers(){
  return JSON.parse(localStorage.getItem('volunteer_users')||'{}');
}
function saveUsers(u){ localStorage.setItem('volunteer_users', JSON.stringify(u)); }

document.addEventListener('DOMContentLoaded', ()=>{
  const emailIn=document.getElementById('email');
  const passIn=document.getElementById('password');
  const loginBtn=document.getElementById('login');
  const regBtn=document.getElementById('register');
  const panel=document.getElementById('volunteer-panel');
  const authBox=document.getElementById('auth-box');
  const title=document.getElementById('auth-title');
  const emailSpan=document.getElementById('volunteer-email');

  function showPanel(email){
    authBox.style.display='none';
    panel.style.display='block';
    emailSpan.textContent=email;
  }

  // Check logged in
  const current = localStorage.getItem('volunteer_current');
  if(current){ showPanel(current); }

  regBtn.addEventListener('click', ()=>{
    const e=emailIn.value.trim(); const p=passIn.value;
    if(!e||!p){ alert('Введите email и пароль'); return }
    const users=getUsers();
    if(users[e]){ alert('Пользователь уже существует'); return }
    users[e]= { password: p };
    saveUsers(users);
    localStorage.setItem('volunteer_current', e);
    showPanel(e);
  });

  loginBtn.addEventListener('click', ()=>{
    const e=emailIn.value.trim(); const p=passIn.value;
    const users=getUsers();
    if(users[e] && users[e].password===p){
      localStorage.setItem('volunteer_current', e);
      showPanel(e);
    } else alert('Неверный логин или пароль');
  });

  document.getElementById('logout') && document.getElementById('logout').addEventListener('click', ()=>{
    localStorage.removeItem('volunteer_current');
    location.reload();
  });
});
