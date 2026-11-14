import re

with open('assets/index-DG0_cRQu.js', 'r') as f:
    code = f.read()

# New clean centered xt component
new_xt = """function xt({s:e}){
  let t=(0,k.useRef)(null),
      u0=S(e)||e.users[0],
      [u,setU]=(0,k.useState)(u0),
      [em,setEm]=(0,k.useState)(u0.email),
      [pw,setPw]=(0,k.useState)(``),
      [sp,setSp]=(0,k.useState)(!1),
      [bad,setBad]=(0,k.useState)(!1),
      [rem,setRem]=(0,k.useState)(!0),
      [th,setTh]=(0,k.useState)(()=>ut()),
      [hub,setHub]=(0,k.useState)(`London HQ (Mayfair)`);

  (0,k.useLayoutEffect)(()=>{
    document.documentElement.classList.add(`is-ready`);
    b.fromTo(t.current,{opacity:0,y:20,scale:.98},{opacity:1,y:0,scale:1,duration:x(.55),ease:`power3.out`,clearProps:`transform`});
  },[]);

  let chooseRep=(rep)=>{
    setU(rep);
    setEm(rep.email);
    setBad(!1);
  };

  let toggleTheme=(ev)=>{
    let next=th===`dark`?`light`:`dark`;
    setTh(next);
    lt(next,ev.currentTarget);
  };

  let submitAuth=(ev)=>{
    if(ev)ev.preventDefault();
    if(pw.length<4){
      setBad(!0);
      b.fromTo(t.current,{x:-10},{x:0,duration:x(.5),ease:`elastic.out(1, 0.3)`});
      return;
    }
    ee(s=>{
      s.settings.signedIn=!0;
      s.settings.me=u.id;
    });
    a(`Welcome back, ${u.name.split(` `)[0]}`);
    location.hash=`#/today`;
  };

  let guestAuth=()=>{
    ee(s=>{
      s.settings.signedIn=!0;
      s.settings.me=u.id;
    });
    a(`Welcome to Tessly, ${u.name.split(` `)[0]} (Guest Mode)`);
    location.hash=`#/today`;
  };

  let pStr=pw.length===0?``:pw.length<4?`Quarry Cut (Too short)`:pw.length<8?`Honed Finish (Good)`:`Polished Grade (Strong)`;
  let pCls=pw.length===0?``:pw.length<4?`is-weak`:pw.length<8?`is-good`:`is-strong`;

  return (0,A.jsxs)(`main`,{
    className:`signin signin--v2`,
    children:[
      (0,A.jsx)(`div`,{className:`signin__bg-layer`,"aria-hidden":`true`}),
      (0,A.jsx)(`div`,{className:`signin__bg-overlay`,"aria-hidden":`true`}),
      (0,A.jsxs)(`div`,{
        className:`signin__centered-box`,
        ref:t,
        children:[
          (0,A.jsxs)(`div`,{
            className:`signin__top-bar`,
            children:[
              (0,A.jsxs)(`div`,{
                className:`signin__hub-status`,
                children:[
                  (0,A.jsx)(`span`,{className:`signin__hub-pulse`}),
                  (0,A.jsxs)(`span`,{children:[`Desk Online · `,hub.split(` `)[0]]})
                ]
              }),
              (0,A.jsx)(`button`,{
                type:`button`,
                className:`signin__theme-btn`,
                onClick:toggleTheme,
                "aria-label":`Toggle Light/Dark Theme`,
                children:(0,A.jsx)(`span`,{
                  className:`signin__theme-icon`,
                  children:th===`dark`?`☀️ Light`:`🌙 Dark`
                })
              })
            ]
          }),
          (0,A.jsxs)(`div`,{
            className:`signin__card-header`,
            children:[
              (0,A.jsx)(`div`,{
                className:`signin__card-icon-wrap`,
                children:(0,A.jsx)(`span`,{
                  className:`brand__mark`,
                  "aria-hidden":`true`,
                  children:(0,A.jsxs)(`svg`,{
                    viewBox:`0 0 24 24`,
                    children:[
                      (0,A.jsx)(`path`,{d:`M4 7.5 12 4l8 3.5-8 3.5z`}),
                      (0,A.jsx)(`path`,{d:`M4 12l8 3.5 8-3.5`}),
                      (0,A.jsx)(`path`,{d:`M4 16.5 12 20l8-3.5`})
                    ]
                  })
                })
              }),
              (0,A.jsx)(`h2`,{className:`signin__card-title`,children:`Sign in to Tessly`}),
              (0,A.jsx)(`p`,{className:`signin__card-desc`,children:`Calder & Moss Surfaces · Sales & Specification Desk`})
            ]
          }),
          (0,A.jsxs)(`div`,{
            className:`signin__rep-picker`,
            children:[
              (0,A.jsxs)(`div`,{
                className:`signin__rep-label-row`,
                children:[
                  (0,A.jsx)(`span`,{className:`signin__rep-label`,children:`QUICK LAUNCH · SELECT EXECUTIVE`}),
                  (0,A.jsx)(`span`,{className:`signin__rep-hint`,children:`1-click select`})
                ]
              }),
              (0,A.jsx)(`div`,{
                className:`signin__rep-list`,
                children:(e.users||[]).slice(0,3).map(rep=>{
                  let isSel=u.id===rep.id;
                  return (0,A.jsxs)(`button`,{
                    key:rep.id,
                    type:`button`,
                    className:`signin__rep-item ${isSel?`is-selected`:``}`,
                    onClick:()=>chooseRep(rep),
                    children:[
                      (0,A.jsx)(`div`,{
                        className:`signin__rep-avatar`,
                        children:(0,A.jsx)(T,{name:rep.name,tone:rep.tone,size:28})
                      }),
                      (0,A.jsx)(`span`,{className:`signin__rep-name`,children:rep.name.split(` `)[0]}),
                      (0,A.jsx)(`span`,{className:`signin__rep-role`,children:rep.role.split(`·`)[0].trim()}),
                      isSel&&(0,A.jsx)(`span`,{className:`signin__rep-check`,children:`✓`})
                    ]
                  });
                })
              })
            ]
          }),
          (0,A.jsxs)(`form`,{
            className:`signin__card signin__card--v2`,
            noValidate:!0,
            onSubmit:submitAuth,
            children:[
              (0,A.jsxs)(`div`,{
                className:`signin__fields`,
                children:[
                  (0,A.jsxs)(`label`,{
                    className:`field`,
                    children:[
                      (0,A.jsxs)(`span`,{
                        className:`field__label-row`,
                        children:[
                          (0,A.jsx)(`span`,{children:`Work email`}),
                          (0,A.jsx)(`button`,{
                            type:`button`,
                            className:`signin__domain-chip`,
                            onClick:()=>setEm(`${em.split(`@`)[0]}@caldermoss.co`),
                            children:`@caldermoss.co`
                          })
                        ]
                      }),
                      (0,A.jsx)(`div`,{
                        className:`signin__input-wrap`,
                        children:(0,A.jsx)(`input`,{
                          className:`input signin__input`,
                          type:`email`,
                          value:em,
                          onChange:ev=>setEm(ev.target.value),
                          autoComplete:`email`,
                          placeholder:`ines@caldermoss.co`,
                          required:!0
                        })
                      })
                    ]
                  }),
                  (0,A.jsxs)(`label`,{
                    className:`field ${bad?`is-bad`:``}`,
                    children:[
                      (0,A.jsxs)(`span`,{
                        className:`field__label-row`,
                        children:[
                          (0,A.jsx)(`span`,{children:`Password`}),
                          pStr&&(0,A.jsx)(`span`,{
                            className:`signin__pass-meter ${pCls}`,
                            children:pStr
                          })
                        ]
                      }),
                      (0,A.jsxs)(`div`,{
                        className:`signin__input-wrap`,
                        children:[
                          (0,A.jsx)(`input`,{
                            className:`input signin__input`,
                            type:sp?`text`:`password`,
                            value:pw,
                            onChange:ev=>{
                              setPw(ev.target.value);
                              setBad(!1);
                            },
                            placeholder:`Any 4+ characters (e.g. stone2026)`,
                            autoComplete:`current-password`,
                            required:!0
                          }),
                          (0,A.jsx)(`button`,{
                            type:`button`,
                            className:`signin__eye-btn`,
                            onClick:()=>setSp(!sp),
                            "aria-label":sp?`Hide password`:`Show password`,
                            children:sp?`👁️`:`👁️‍🗨️`
                          })
                        ]
                      }),
                      bad&&(0,A.jsx)(`small`,{className:`field__err`,children:`Enter at least 4 characters to unlock.`})
                    ]
                  })
                ]
              }),
              (0,A.jsxs)(`div`,{
                className:`signin__options-row`,
                children:[
                  (0,A.jsxs)(`label`,{
                    className:`signin__checkbox-label`,
                    children:[
                      (0,A.jsx)(`input`,{
                        type:`checkbox`,
                        checked:rem,
                        onChange:ev=>setRem(ev.target.checked),
                        className:`signin__checkbox`
                      }),
                      (0,A.jsx)(`span`,{children:`Remember workstation`})
                    ]
                  }),
                  (0,A.jsx)(`button`,{
                    type:`button`,
                    className:`signin__forgot-btn`,
                    onClick:()=>a(`Demo Mode: Any 4+ character password will unlock the sales desk.`),
                    children:`Forgot password?`
                  })
                ]
              }),
              (0,A.jsxs)(`div`,{
                className:`signin__actions`,
                children:[
                  (0,A.jsxs)(`button`,{
                    className:`btn btn--primary signin__submit-btn`,
                    type:`submit`,
                    children:[
                      (0,A.jsx)(`span`,{children:`Sign In to Sales Desk`}),
                      (0,A.jsx)(`span`,{className:`signin__btn-arrow`,children:`→`})
                    ]
                  }),
                  (0,A.jsx)(`button`,{
                    className:`btn btn--ghost signin__guest-btn`,
                    type:`button`,
                    onClick:guestAuth,
                    children:(0,A.jsx)(`span`,{children:`Instant Demo Access (Continue as Guest)`})
                  })
                ]
              }),
              (0,A.jsxs)(`div`,{
                className:`signin__card-footer`,
                children:[
                  (0,A.jsx)(`span`,{className:`signin__sec-icon`,children:`🔒`}),
                  (0,A.jsx)(`span`,{children:`256-bit TLS Encrypted · Calder & Moss IAM`})
                ]
              })
            ]
          }),
          (0,A.jsxs)(`div`,{
            className:`signin__hub-selector`,
            children:[
              (0,A.jsx)(`span`,{className:`signin__hub-label`,children:`Hub:`}),
              [`London HQ (Mayfair)`,`Carrara Logistics`,`Milan Studio`].map(loc=>(0,A.jsx)(`button`,{
                key:loc,
                type:`button`,
                className:`signin__hub-pill ${hub===loc?`is-active`:``}`,
                onClick:()=>setHub(loc),
                children:loc
              }))
            ]
          })
        ]
      })
    ]
  });
}"""

start_marker = "function xt({s:e}){"
end_marker = "function St(){"
start_idx = code.find(start_marker)
end_idx = code.find(end_marker, start_idx)
assert start_idx != -1 and end_idx != -1, "Could not find xt boundaries"

code = code[:start_idx] + new_xt + code[end_idx:]

with open('assets/index-DG0_cRQu.js', 'w') as f:
    f.write(code)

print("Updated index-DG0_cRQu.js with clean centered login container on professional CRM background.")
