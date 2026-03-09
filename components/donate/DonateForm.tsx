import React from 'react';

const DonateForm = () => {
  return (
    <section id="donate-form" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div style={{position:'relative', overflow:'hidden', height:1200, width:'100%'}}>
          <iframe 
            title='Donation form powered by Zeffy' 
            style={{position: 'absolute', border: 0, top:0, left:0, bottom:0, right:0, width:'100%', height:'100%'}}
            src='https://www.zeffy.com/embed/donation-form/save-black-history'
            allowPaymentRequest 
            allowTransparency={true}
          />
        </div>
      </div>
    </section>
  );
};

export default DonateForm;